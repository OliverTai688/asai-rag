import OpenAI from "openai";
import { z } from "zod";
import type { ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { AiModule } from "@/generated/prisma/enums";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import type { AppSession } from "@/lib/auth/session";
import { getClientForMember } from "@/lib/clients/client-repository";
import {
  normalizeAiError,
  persistAiGenerationFailure,
  persistAiGenerationSuccess,
} from "@/lib/ai/generation-usage-repository";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";

const spinRequestSchema = z.object({
  phase: z.enum(["SITUATION", "PROBLEM", "IMPLICATION", "NEED_PAYOFF"]),
  mode: z.enum(["SELF_CLARIFY", "QUESTION_DESIGN"]),
  clientId: z.string().trim().min(1).max(120),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().trim().max(5000),
      }),
    )
    .max(30)
    .default([]),
});

const SYSTEM_PROMPT = `你是一位專業的保險銷售策略顧問，專精於 SPIN 銷售法（Situation, Problem, Implication, Need-payoff）。
你的任務是引導保險業務員（使用者）進行訪前規劃與客戶分析。

### 核心原則 (Park et al. 2023 - Generative Agents 架構)：
1. **記憶 (Memory Stream)**：請參考提供的「客戶資訊」與「對話紀錄」，記住已掌握的客戶事實。
2. **反思 (Reflection)**：在對話中，主動反思已獲得的資訊如何轉化為風險缺口（INSIGHT）。
3. **規劃 (Planning)**：嚴格遵循 SPIN 的四個階段，但在過程中必須靈活回應使用者的任何提問。

### 顧問人格與風格：
- **主動回答**：如果使用者詢問專業知識（如：什麼是收入中斷風險？、醫療險有哪些險種？），你必須先給出專業且易懂的解答。
- **主軸推進**：在回答使用者的問題後，你必須「主動」帶領使用者回到當前的 SPIN 階段。例如：「回答完您的問題，我們回到雅婷的情況，關於她的家庭責任...」。
- **專業親切**：語氣專業但不過於生硬，像是一位經驗豐富的導師。
- **結構化輸出**：適時使用結構化標籤（見下文）。

### 結構化標籤 (必須使用)：
1. **[[INSIGHT:內容]]**：當你分析出客戶的一個關鍵痛點或背景重點時使用。這會更新使用者的洞察面板。
2. **[[QUESTION:問題內容]]**：為使用者設計具體的問句。這會出現在建議問題清單中。
3. **[[PHASE_COMPLETE]]**：當你認為當前階段的資訊收集/分析已經足夠，建議使用者進入下一階段時使用。

### SPIN 階段引導指南：
- **SITUATION (情境)**：收集客戶的事實背景。目標是建立完整的財務與家庭地圖。
- **PROBLEM (問題)**：引發客戶對缺口的意識。重點是「讓客戶自己說出擔心什麼」。
- **IMPLICATION (暗示)**：放大問題的嚴重性。引導客戶思考「如果不處理，後果是什麼？代價有多大？」。
- **NEED-PAYOFF (需求確認)**：讓客戶確認解決方案的價值。目標是讓客戶說出「這確實值得規劃」。

### 輸出規範：
- 一律使用繁體中文。
- 每次回覆應包含：1. 回應使用者輸入 (含回答問題) -> 2. 顧問分析 -> 3. 下一步指引。
- 標籤請放在回覆的末尾或段落間，不要影響閱讀。`;

export async function POST(req: Request) {
  const startedAt = Date.now();
  let session: AppSession | undefined;
  let scopedClientId: string | undefined;
  let providerAttempted = false;

  try {
    session = await requireCurrentMember();
    const currentSession = session;
    const parsedBody = spinRequestSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_SPIN_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const body = parsedBody.data;
    scopedClientId = body.clientId;
    const quota = canUseAiModule(session, AiModule.SPIN);

    if (!quota.allowed) {
      return Response.json(
        {
          error: quota.code,
          remaining: quota.remaining,
          message: "AI 使用額度已用完，請聯絡管理員或升級方案。",
        },
        { status: 429 },
      );
    }

    const clientData = await getClientForMember(session, body.clientId);

    if (!clientData) {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    if (!process.env.OPENAI_API_KEY) {
      await persistAiGenerationFailure({
        session,
        module: AiModule.SPIN,
        model: MODEL,
        clientId: scopedClientId,
        latencyMs: Date.now() - startedAt,
        error: "OPENAI_API_KEY is not configured",
      });

      return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const contextInstruction = `
【當前脈絡】
- 客戶姓名：${clientData.name}
- 客戶背景：${clientData.occupation || "未填寫"}，年收入 ${clientData.annualIncome}
- 當前 SPIN 階段：${body.phase}
- 輔助模式：${body.mode === "SELF_CLARIFY" ? "自我釐清 (整理客戶資訊)" : "問題設計 (設計對客戶的問句)"}
- 客戶家庭與保單：${JSON.stringify({ family: clientData.family, policies: clientData.existingPolicies })}

【任務重點】
1. 如果使用者問問題，請先回答。
2. 根據目前掌握的資訊，產出 [[INSIGHT]] 或 [[QUESTION]]。
3. 如果當前階段資訊已足夠，請加上 [[PHASE_COMPLETE]]。
`;

    const openaiMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextInstruction },
      ...body.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    providerAttempted = true;
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: openaiMessages,
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0.7,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let usage: ChatCompletionChunk["usage"] | undefined;

        try {
          for await (const chunk of response) {
            usage = chunk.usage ?? usage;
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }

          await persistAiGenerationSuccess({
            session: currentSession,
            module: AiModule.SPIN,
            clientId: scopedClientId,
            usage: {
              model: MODEL,
              promptTokens: usage?.prompt_tokens,
              completionTokens: usage?.completion_tokens,
              totalTokens: usage?.total_tokens,
              latencyMs: Date.now() - startedAt,
            },
          });

          controller.close();
        } catch (error) {
          await persistAiGenerationFailure({
            session: currentSession,
            module: AiModule.SPIN,
            model: MODEL,
            clientId: scopedClientId,
            latencyMs: Date.now() - startedAt,
            error: normalizeAiError(error, "SPIN stream failed"),
          });
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    if (!session) {
      return authErrorResponse(error);
    }

    if (providerAttempted) {
      await persistAiGenerationFailure({
        session,
        module: AiModule.SPIN,
        model: MODEL,
        clientId: scopedClientId,
        latencyMs: Date.now() - startedAt,
        error: normalizeAiError(error, "SPIN AI failed"),
      });
    }

    return Response.json({ error: "SPIN_AI_FAILED" }, { status: 500 });
  }
}
