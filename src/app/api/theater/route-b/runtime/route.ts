import { z } from "zod";
import { AiModule } from "@/generated/prisma/enums";
import {
  buildTheaterRouteBCharacterInput,
  buildTheaterRouteBDirectorInput,
  type TheaterRouteBHandoffPacket,
  type TheaterRouteBVisibilityScope,
} from "@/domains/theater/route-b-handoff";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  buildRouteBSessionDraft,
  buildRouteBTurnCreateData,
  isRouteBTurnVisibleToCharacter,
} from "@/lib/theater/route-b-session-repository";

const routeBVisibilityScopeSchema = z.enum(["GROUP", "PRIVATE", "DIRECTOR_ONLY", "NARRATOR"]);
const routeBRuntimeIntentSchema = z.enum(["SESSION_DRAFT", "DIRECTOR", "CHARACTER", "FEEDBACK"]);

const routeBHandoffSchema = z.custom<TheaterRouteBHandoffPacket>(
  (value) => isTheaterRouteBHandoffPacket(value),
  "Invalid Route B handoff packet.",
);

const routeBTurnRefSchema = z.object({
  id: z.string().trim().min(1).max(120),
  speakerCharacterId: z.string().trim().min(1).max(160).optional(),
  addresseeCharacterId: z.string().trim().min(1).max(160).optional(),
  visibilityScope: routeBVisibilityScopeSchema,
  content: z.string().trim().min(1).max(4000),
});

const routeBRuntimeRequestSchema = z.object({
  intent: routeBRuntimeIntentSchema,
  handoff: routeBHandoffSchema,
  sessionId: z.string().trim().min(6).max(120).optional(),
  clientId: z.string().trim().min(1).max(80).optional(),
  spinSessionId: z.string().trim().min(1).max(80).optional(),
  isDemo: z.boolean().optional(),
  salespersonUtterance: z.string().trim().min(1).max(4000).optional(),
  characterId: z.string().trim().min(1).max(160).optional(),
  addresseeCharacterId: z.string().trim().min(1).max(160).optional(),
  visibilityScope: routeBVisibilityScopeSchema.default("GROUP"),
  directorDirective: z.string().trim().min(1).max(2000).optional(),
  history: z.array(routeBTurnRefSchema).max(24).default([]),
});

type RouteBRuntimeRequest = z.infer<typeof routeBRuntimeRequestSchema>;

export async function POST(req: Request) {
  try {
    const session = await requireCurrentMember();
    const parsed = routeBRuntimeRequestSchema.safeParse(await req.json().catch(() => null));

    if (!parsed.success) {
      return Response.json(
        {
          error: "INVALID_ROUTE_B_RUNTIME_INPUT",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const boundaryIssue = validateRuntimeBoundary(body.handoff);

    if (boundaryIssue) {
      return Response.json(
        {
          error: "INVALID_ROUTE_B_RUNTIME_BOUNDARY",
          message: boundaryIssue,
        },
        { status: 400 },
      );
    }

    const sessionDraft = buildRouteBSessionDraft(
      body.handoff,
      {
        organizationId: session.organization.id,
        unitId: session.membership.primaryUnitId,
        clientId: body.clientId,
        ownerId: session.user.id,
        spinSessionId: body.spinSessionId,
        isDemo: body.isDemo,
      },
      { sessionId: body.sessionId },
    );

    const basePayload = {
      routeB: {
        status: "DRY_RUN_READY",
        intent: body.intent,
        providerCallAttempted: false,
        aiUsageLogWritten: false,
        aiUsageLogRequiredWhenProviderEnabled: true,
        storesProviderBody: false,
      },
      sessionDraft: {
        sessionId: sessionDraft.sessionId,
        routeBSceneId: sessionDraft.sessionData.routeBSceneId,
        routeBSourcePacketId: sessionDraft.sessionData.routeBSourcePacketId,
        routeBEnabled: sessionDraft.sessionData.routeBEnabled,
        characterCount: sessionDraft.charactersData.length,
        openingTurnVisibilityScope: sessionDraft.openingTurnData.visibilityScope,
        aiUsageLogRequiredFor: sessionDraft.aiUsageLogRequiredFor,
      },
      privacyProof: buildPrivacyProof(body.handoff),
    };

    if (body.intent === "SESSION_DRAFT") {
      return Response.json(basePayload, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const quota = canUseAiModule(session, AiModule.THEATER);

    if (!quota.allowed) {
      return Response.json(
        {
          error: quota.code,
          remaining: quota.remaining,
          message: "AI 使用額度已用完，請聯絡管理員或升級方案。",
          providerCallAttempted: false,
          aiUsageLogWritten: false,
        },
        { status: 429 },
      );
    }

    const preview = buildRuntimeInputPreview(body);

    if (process.env.ENABLE_ROUTE_B_THEATER_PROVIDER !== "true") {
      return Response.json(
        {
          ...basePayload,
          routeB: {
            ...basePayload.routeB,
            status: "GUARDED_DISABLED",
            disabledReason: "ROUTE_B_PROVIDER_DISABLED",
            message:
              "Route B director/character/feedback provider calls are disabled. No provider call was attempted, so no AiUsageLog row is written.",
          },
          runtimeInputPreview: preview,
        },
        {
          status: 503,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    return Response.json(
      {
        ...basePayload,
        routeB: {
          ...basePayload.routeB,
          status: "PROVIDER_NOT_IMPLEMENTED",
          disabledReason: "ROUTE_B_PROVIDER_IMPLEMENTATION_MISSING",
          message:
            "Route B provider flag is on, but provider execution remains blocked until success/error AiUsageLog proof is implemented.",
        },
        runtimeInputPreview: preview,
      },
      {
        status: 501,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}

function buildRuntimeInputPreview(body: RouteBRuntimeRequest) {
  if (body.intent === "DIRECTOR") {
    if (!body.salespersonUtterance) {
      return { error: "SALESPERSON_UTTERANCE_REQUIRED" };
    }

    const input = buildTheaterRouteBDirectorInput(body.handoff, {
      salespersonUtterance: body.salespersonUtterance,
      history: body.history,
    });

    return {
      kind: "DIRECTOR",
      sceneId: input.sceneId,
      characterCount: input.characterCards.length,
      scopedHistoryCount: input.scopedHistory.length,
      allowedActions: input.allowedActions,
      aiUsageLogRequired: input.aiUsageLogRequired,
    };
  }

  if (body.intent === "CHARACTER") {
    if (!body.characterId || !body.directorDirective) {
      return { error: "CHARACTER_ID_AND_DIRECTOR_DIRECTIVE_REQUIRED" };
    }

    const input = buildTheaterRouteBCharacterInput(body.handoff, {
      characterId: body.characterId,
      addresseeCharacterId: body.addresseeCharacterId,
      visibilityScope: body.visibilityScope as TheaterRouteBVisibilityScope,
      directorDirective: body.directorDirective,
      history: body.history,
    });

    return {
      kind: "CHARACTER",
      sceneId: input.sceneId,
      characterId: input.characterCard.id,
      addresseeCharacterId: input.addresseeCharacterId,
      visibilityScope: input.visibilityScope,
      visibleHistoryCount: input.visibleHistory.length,
      aiUsageLogRequired: input.aiUsageLogRequired,
    };
  }

  return {
    kind: "FEEDBACK",
    sceneId: body.handoff.scene.id,
    qualitativePerspectives: ["教練的耳朵", "客戶的眼睛", "沉默裡的需求", "守門的良心", "決策的橋"],
    historyCount: body.history.length,
    aiUsageLogRequired: true,
  };
}

function buildPrivacyProof(handoff: TheaterRouteBHandoffPacket) {
  const [speaker, addressee, thirdParty] = handoff.scene.characters;
  const privateVisibility =
    speaker && addressee && thirdParty
      ? (() => {
          const turn = buildRouteBTurnCreateData({
            sessionId: "route_b_runtime_visibility_probe",
            actorKind: "CHARACTER",
            speakerCharacterId: speaker.id,
            addresseeCharacterId: addressee.id,
            content: "只給指定角色的私聊狀態。",
            visibilityScope: "PRIVATE",
          });

          return {
            checked: true,
            speakerVisible: isRouteBTurnVisibleToCharacter(turn, speaker.id),
            addresseeVisible: isRouteBTurnVisibleToCharacter(turn, addressee.id),
            thirdPartyVisible: isRouteBTurnVisibleToCharacter(turn, thirdParty.id),
          };
        })()
      : { checked: false, reason: "Route B privacy probe requires at least three characters." };

  return {
    characterCount: handoff.scene.characters.length,
    privateVisibility,
    statePatchesWriteConfirmedCrmFact: handoff.scene.statePatches.some((patch) => patch.writesConfirmedCrmFact !== false),
    aiUsageLogRequiredFor: handoff.aiUsagePlan.calls.map((call) => call.kind),
    providerCallAttempted: false,
    storesProviderBody: false,
  };
}

function validateRuntimeBoundary(handoff: TheaterRouteBHandoffPacket): string | undefined {
  if (handoff.scene.statePatches.some((patch) => patch.writesConfirmedCrmFact !== false)) {
    return "Route B state patches cannot write confirmed CRM facts.";
  }

  if (handoff.aiUsagePlan.noProviderDuringHandoffBuild !== true) {
    return "Route B handoff must prove no provider call during handoff build.";
  }

  const invalidUsagePlan = handoff.aiUsagePlan.calls.some(
    (call) =>
      call.requiresAiUsageLog !== true ||
      call.logOn !== "SUCCESS_AND_PROVIDER_ERROR" ||
      call.storesRawProviderPayload !== false,
  );

  if (invalidUsagePlan) {
    return "Route B director/character/feedback calls must require AiUsageLog and avoid raw provider payload storage.";
  }

  return undefined;
}

function isTheaterRouteBHandoffPacket(value: unknown): value is TheaterRouteBHandoffPacket {
  if (!isRecord(value)) return false;
  if (!hasString(value, "id") || !hasString(value, "sourcePacketId")) return false;
  if (!isRecord(value.scene) || !hasString(value.scene, "id")) return false;
  if (!Array.isArray(value.scene.characters) || value.scene.characters.length === 0) return false;
  if (!Array.isArray(value.scene.statePatches)) return false;
  if (!isRecord(value.aiUsagePlan) || !Array.isArray(value.aiUsagePlan.calls)) return false;
  if (!isRecord(value.runtimeActivation)) return false;

  return true;
}

function hasString(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === "string" && record[key].trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
