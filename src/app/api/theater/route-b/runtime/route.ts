import { z } from "zod";
import { AiModule } from "@/generated/prisma/enums";
import {
  buildTheaterRouteBCharacterInput,
  buildTheaterRouteBDirectorInput,
  type TheaterRouteBCallKind,
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
import {
  isTheaterRouteBHandoffPacket,
  validateRouteBHandoffBoundary,
} from "@/lib/theater/route-b-boundary";

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
type RouteBRuntimeActionId = "route-b-director" | "route-b-character" | "route-b-feedback";
type RouteBRuntimePreviewKind = Exclude<RouteBRuntimeRequest["intent"], "SESSION_DRAFT">;

interface RouteBRuntimeInputContract {
  requiredFields: string[];
  missingFields: string[];
  validated: boolean;
  dataClasses: Array<"STAGE_STATE" | "CLIENT_FACTS" | "CLIENT_INFERENCES" | "CLIENT_UNKNOWNS">;
  safeInputOnly: true;
  rawPrivateTranscriptIncluded: false;
}

interface RouteBRuntimeInputPreviewBase {
  kind: RouteBRuntimePreviewKind;
  sourceAlignment: {
    agentId: "asai.theater.route_b";
    ownerSurface: "/theater/[sessionId]";
    endpoint: "/api/theater/route-b/runtime";
    actionId: RouteBRuntimeActionId;
    registryReadiness: "internal-only";
  };
  inputContract: RouteBRuntimeInputContract;
  aiUsageLogPlan: {
    module: "THEATER";
    callKind: TheaterRouteBCallKind;
    requiredWhenProviderEnabled: true;
    logOn: "SUCCESS_AND_PROVIDER_ERROR";
    storesProviderBody: false;
    successPathImplemented: false;
  };
  providerBoundary: {
    providerCallAttempted: false;
    providerEnabledByEnv: boolean;
    providerBodyStored: false;
    guardedDisabledByDefault: true;
  };
}

type RouteBRuntimeInputPreview = RouteBRuntimeInputPreviewBase & {
  sceneId?: string;
  characterCount?: number;
  characterId?: string;
  addresseeCharacterId?: string;
  visibilityScope?: TheaterRouteBVisibilityScope;
  scopedHistoryCount?: number;
  scopedHistoryVisibilitySummary?: Record<TheaterRouteBVisibilityScope, number>;
  visibleHistoryCount?: number;
  allowedActions?: Array<"ASK_CHARACTER" | "REQUEST_NARRATOR_QUESTION" | "PATCH_PRIVATE_STATE" | "END_TURN">;
  qualitativePerspectives?: string[];
  historyCount?: number;
  historyVisibilitySummary?: Record<TheaterRouteBVisibilityScope, number>;
};

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
    const boundaryIssue = validateRouteBHandoffBoundary(body.handoff);

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

    const preview = buildRuntimeInputPreview(body);

    if (!preview.inputContract.validated) {
      return Response.json(
        {
          ...basePayload,
          error: "ROUTE_B_RUNTIME_PREFLIGHT_INVALID",
          routeB: {
            ...basePayload.routeB,
            status: "PREFLIGHT_INVALID",
            disabledReason: "ROUTE_B_RUNTIME_INPUT_CONTRACT_FAILED",
            providerCallAttempted: false,
            aiUsageLogWritten: false,
          },
          runtimeInputPreview: preview,
        },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        },
      );
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

function buildRuntimeInputPreview(body: RouteBRuntimeRequest): RouteBRuntimeInputPreview {
  if (body.intent === "DIRECTOR") {
    const requiredFields = ["salespersonUtterance"];
    const missingFields = body.salespersonUtterance ? [] : ["salespersonUtterance"];
    const base = buildRuntimeInputPreviewBase("DIRECTOR", requiredFields, missingFields);

    if (missingFields.length > 0) {
      return base;
    }

    const input = buildTheaterRouteBDirectorInput(body.handoff, {
      salespersonUtterance: body.salespersonUtterance ?? "",
      history: body.history,
    });

    return {
      ...base,
      kind: "DIRECTOR",
      sceneId: input.sceneId,
      characterCount: input.characterCards.length,
      scopedHistoryCount: input.scopedHistory.length,
      scopedHistoryVisibilitySummary: summarizeVisibility(input.scopedHistory),
      allowedActions: input.allowedActions,
    };
  }

  if (body.intent === "CHARACTER") {
    const requiredFields = ["characterId", "directorDirective"];
    const missingFields = [
      body.characterId ? undefined : "characterId",
      body.directorDirective ? undefined : "directorDirective",
      body.characterId && !body.handoff.scene.characters.some((character) => character.id === body.characterId)
        ? "knownCharacterId"
        : undefined,
    ].filter(Boolean) as string[];
    const base = buildRuntimeInputPreviewBase("CHARACTER", requiredFields, missingFields);

    if (missingFields.length > 0) {
      return base;
    }

    const input = buildTheaterRouteBCharacterInput(body.handoff, {
      characterId: body.characterId ?? "",
      addresseeCharacterId: body.addresseeCharacterId,
      visibilityScope: body.visibilityScope as TheaterRouteBVisibilityScope,
      directorDirective: body.directorDirective ?? "",
      history: body.history,
    });

    return {
      ...base,
      kind: "CHARACTER",
      sceneId: input.sceneId,
      characterId: input.characterCard.id,
      addresseeCharacterId: input.addresseeCharacterId,
      visibilityScope: input.visibilityScope,
      visibleHistoryCount: input.visibleHistory.length,
    };
  }

  const base = buildRuntimeInputPreviewBase("FEEDBACK", [], []);

  return {
    ...base,
    kind: "FEEDBACK",
    sceneId: body.handoff.scene.id,
    qualitativePerspectives: ["教練的耳朵", "客戶的眼睛", "沉默裡的需求", "守門的良心", "決策的橋"],
    historyCount: body.history.length,
    historyVisibilitySummary: summarizeVisibility(body.history),
  };
}

function buildRuntimeInputPreviewBase(
  kind: RouteBRuntimePreviewKind,
  requiredFields: string[],
  missingFields: string[],
): RouteBRuntimeInputPreviewBase {
  return {
    kind,
    sourceAlignment: {
      agentId: "asai.theater.route_b",
      ownerSurface: "/theater/[sessionId]",
      endpoint: "/api/theater/route-b/runtime",
      actionId: routeBRuntimeActionId(kind),
      registryReadiness: "internal-only",
    },
    inputContract: {
      requiredFields,
      missingFields,
      validated: missingFields.length === 0,
      dataClasses: ["STAGE_STATE", "CLIENT_FACTS", "CLIENT_INFERENCES", "CLIENT_UNKNOWNS"],
      safeInputOnly: true,
      rawPrivateTranscriptIncluded: false,
    },
    aiUsageLogPlan: {
      module: "THEATER",
      callKind: kind,
      requiredWhenProviderEnabled: true,
      logOn: "SUCCESS_AND_PROVIDER_ERROR",
      storesProviderBody: false,
      successPathImplemented: false,
    },
    providerBoundary: {
      providerCallAttempted: false,
      providerEnabledByEnv: process.env.ENABLE_ROUTE_B_THEATER_PROVIDER === "true",
      providerBodyStored: false,
      guardedDisabledByDefault: true,
    },
  };
}

function routeBRuntimeActionId(kind: RouteBRuntimePreviewKind): RouteBRuntimeActionId {
  if (kind === "DIRECTOR") return "route-b-director";
  if (kind === "CHARACTER") return "route-b-character";
  return "route-b-feedback";
}

function summarizeVisibility(history: Array<{ visibilityScope: TheaterRouteBVisibilityScope }>) {
  return history.reduce<Record<TheaterRouteBVisibilityScope, number>>(
    (summary, turn) => {
      summary[turn.visibilityScope] += 1;
      return summary;
    },
    { GROUP: 0, PRIVATE: 0, DIRECTOR_ONLY: 0, NARRATOR: 0 },
  );
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
