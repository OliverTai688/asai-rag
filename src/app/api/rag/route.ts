import { z } from "zod";
import { AiModule } from "@/generated/prisma/enums";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";

const querySchema = z.object({
  question: z.string().trim().min(1, "Question cannot be empty"),
});

const RAG_DISABLED_CODE = "RAG_DISABLED_FOR_PRIVATE_BETA";

export async function POST(req: Request) {
  try {
    const session = await requireCurrentMember();
    const parsedBody = querySchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_RAG_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const quota = canUseAiModule(session, AiModule.RAG);

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

    return Response.json(
      {
        error: RAG_DISABLED_CODE,
        message:
          "RAG is disabled for private beta. Use the assistant or interview workflows while the knowledge base pipeline is being prepared.",
        launchPosture: "disabled_guarded",
        providerAttempted: false,
      },
      { status: 503 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
