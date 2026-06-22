import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { ClientSensitivity, InteractionEventType } from "@/generated/prisma/enums";
import {
  buildTheaterRouteBNextTurnAppendConfirmation,
  type TheaterRouteBNextTurnAppendConfirmationInput,
  type TheaterRouteBNextTurnAppendRejectionCode,
} from "@/domains/theater/route-b-next-turn-append";
import {
  buildTheaterRouteBFeedbackReview,
  isTheaterRouteBFeedbackReview,
  type BuildTheaterRouteBFeedbackReviewOptions,
  type TheaterRouteBFeedbackReview,
} from "@/domains/theater/route-b-feedback-review";
import {
  buildRouteBComplianceReviewIntakeFromFeedbackReview,
  isRouteBComplianceReviewIntake,
  type RouteBComplianceReviewIntake,
} from "@/domains/theater/route-b-compliance-review-intake";
import {
  buildRouteBComplianceReviewQueue,
  isRouteBComplianceReviewQueue,
  type RouteBComplianceReviewQueue,
} from "@/domains/theater/route-b-compliance-review-queue";
import {
  buildRouteBRedLineActionPersistenceState,
  isRouteBRedLineActionPersistenceState,
  type RouteBRedLineActionPersistenceState,
  type RouteBRedLineActionRecord,
} from "@/domains/theater/route-b-red-line-action-workflow";
import { buildTheaterRouteBStatePatch } from "@/domains/theater/route-b-handoff";
import type { TheaterRouteBHandoffPacket } from "@/domains/theater/route-b-handoff";
import type { RouteBSessionSnapshot } from "@/domains/theater/route-b-session";
import { canReadClientDetail } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  buildRouteBTurnCreateData,
  persistRouteBHandoffDraft,
} from "@/lib/theater/route-b-session-repository";

export type RouteBSensitivityApproval = {
  reason: string;
  riskAccepted: true;
};

export type CreateRouteBSessionInput = {
  handoff: TheaterRouteBHandoffPacket;
  clientId?: string | null;
  spinSessionId?: string | null;
  isDemo?: boolean;
  sensitivityApproval?: RouteBSensitivityApproval;
};

export type CreateRouteBSessionResult =
  | { status: "CREATED"; data: RouteBSessionSnapshot }
  | { status: "CLIENT_NOT_FOUND" }
  | { status: "CLIENT_FORBIDDEN" }
  | { status: "BLOCKED_SENSITIVE"; message: string };

export type GetRouteBSessionResult =
  | { status: "OK"; data: RouteBSessionSnapshot }
  | { status: "NOT_FOUND" };

export type AppendRouteBAdvisorTurnInput = {
  content: string;
  visibilityScope: "GROUP" | "PRIVATE";
  addresseeRouteBCharacterId?: string | null;
  statePatch?: {
    targetRouteBCharacterId: string;
    summary: string;
  } | null;
};

export type AppendRouteBAdvisorTurnResult =
  | { status: "CREATED"; data: RouteBSessionSnapshot }
  | { status: "NOT_FOUND" }
  | { status: "INVALID_PRIVATE_ADDRESSEE" }
  | { status: "INVALID_STATE_PATCH_TARGET" };

export type AppendRouteBNextTurnCandidateInput = TheaterRouteBNextTurnAppendConfirmationInput;

export type AppendRouteBNextTurnCandidateResult =
  | { status: "CREATED"; data: RouteBSessionSnapshot }
  | { status: "NOT_FOUND" }
  | { status: "INVALID_APPEND_CANDIDATE"; errorCode: TheaterRouteBNextTurnAppendRejectionCode; message: string };

export type RouteBFeedbackReviewInput = Pick<
  BuildTheaterRouteBFeedbackReviewOptions,
  "selectedPerspectiveIds" | "notApplicableRedLines"
>;

export type GetRouteBFeedbackReviewResult =
  | { status: "OK"; data: TheaterRouteBFeedbackReview }
  | { status: "EMPTY" }
  | { status: "NOT_FOUND" };

export type CreateRouteBFeedbackReviewResult =
  | { status: "CREATED"; data: TheaterRouteBFeedbackReview }
  | { status: "NOT_FOUND" };

export type GetRouteBComplianceReviewIntakeResult =
  | { status: "OK"; data: RouteBComplianceReviewIntake }
  | { status: "EMPTY" }
  | { status: "NOT_FOUND" };

export type ListRouteBComplianceReviewQueueResult = { status: "OK"; data: RouteBComplianceReviewQueue };

export type GetRouteBRedLineActionStateResult =
  | { status: "OK"; data: RouteBRedLineActionPersistenceState }
  | { status: "NOT_FOUND" };

export type UpdateRouteBRedLineActionStateInput = {
  records: RouteBRedLineActionRecord[];
};

export type UpdateRouteBRedLineActionStateResult =
  | { status: "UPDATED"; data: RouteBRedLineActionPersistenceState }
  | { status: "NOT_FOUND" };

const routeBSessionInclude = {
  characters: {
    orderBy: [{ isFocus: "desc" }, { createdAt: "asc" }],
  },
  turns: {
    orderBy: { createdAt: "asc" },
    include: {
      speakerCharacter: {
        select: { routeBCharacterId: true },
      },
      addresseeCharacter: {
        select: { routeBCharacterId: true },
      },
    },
  },
} satisfies Prisma.TheaterSessionInclude;

type RouteBSessionRecord = Prisma.TheaterSessionGetPayload<{ include: typeof routeBSessionInclude }>;

export async function createRouteBSessionForMember(
  session: AppSession,
  input: CreateRouteBSessionInput,
): Promise<CreateRouteBSessionResult> {
  const allowedClient = input.clientId
    ? await prisma.client.findFirst({
        where: {
          id: input.clientId,
          organizationId: session.organization.id,
          status: { not: "ARCHIVED" },
        },
        select: {
          id: true,
          organizationId: true,
          ownerId: true,
          sensitivity: true,
        },
      })
    : null;

  if (input.clientId && !allowedClient) {
    return { status: "CLIENT_NOT_FOUND" };
  }

  if (allowedClient && !canReadClientDetail(session, allowedClient)) {
    return { status: "CLIENT_FORBIDDEN" };
  }

  if (allowedClient?.sensitivity === ClientSensitivity.HIGHLY_SENSITIVE && !input.sensitivityApproval) {
    return {
      status: "BLOCKED_SENSITIVE",
      message: "高敏感客戶需要 reason 與 riskAccepted 才能建立 Route B 劇場 session。",
    };
  }

  const sessionId = `route_b_session_${randomUUID().replaceAll("-", "")}`;

  const data = await prisma.$transaction(async (tx) => {
    await persistRouteBHandoffDraft(tx, session, input.handoff, {
      clientId: input.clientId ?? null,
      spinSessionId: input.spinSessionId ?? null,
      isDemo: input.isDemo,
      sessionId,
    });

    if (allowedClient?.sensitivity === ClientSensitivity.HIGHLY_SENSITIVE && input.sensitivityApproval) {
      await tx.interactionEvent.create({
        data: {
          organizationId: session.organization.id,
          unitId: session.membership.primaryUnitId,
          clientId: allowedClient.id,
          actorId: session.user.id,
          type: InteractionEventType.COMPLIANCE,
          title: "高敏感 Route B 劇場建場確認",
          description: "顧問已確認高敏感客戶進入 Route B 劇場的使用界線。",
          metadata: toInputJson({
            source: "theater_route_b_session",
            theaterSessionId: sessionId,
            reason: sanitizeRouteBText(input.sensitivityApproval.reason),
            riskAccepted: true,
            writesConfirmedCrmFact: false,
          }),
        },
      });
    }

    const record = await tx.theaterSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: routeBSessionInclude,
    });

    return toRouteBSessionSnapshot(record);
  });

  return { status: "CREATED", data };
}

export async function getRouteBSessionForMember(
  session: AppSession,
  sessionId: string,
): Promise<GetRouteBSessionResult> {
  const record = await prisma.theaterSession.findFirst({
    where: {
      id: sessionId,
      organizationId: session.organization.id,
      ownerId: session.user.id,
      routeBEnabled: true,
    },
    include: routeBSessionInclude,
  });

  if (!record) {
    return { status: "NOT_FOUND" };
  }

  return { status: "OK", data: toRouteBSessionSnapshot(record) };
}

export async function getRouteBFeedbackReviewForMember(
  session: AppSession,
  sessionId: string,
): Promise<GetRouteBFeedbackReviewResult> {
  const record = await prisma.theaterSession.findFirst({
    where: {
      id: sessionId,
      organizationId: session.organization.id,
      ownerId: session.user.id,
      routeBEnabled: true,
    },
    select: {
      sceneState: true,
    },
  });

  if (!record) {
    return { status: "NOT_FOUND" };
  }

  const feedbackReview = asRecord(record.sceneState).feedbackReview;
  if (!isTheaterRouteBFeedbackReview(feedbackReview)) {
    return { status: "EMPTY" };
  }

  return { status: "OK", data: feedbackReview };
}

export async function createRouteBFeedbackReviewForMember(
  session: AppSession,
  sessionId: string,
  input: RouteBFeedbackReviewInput,
): Promise<CreateRouteBFeedbackReviewResult> {
  const data = await prisma.$transaction(async (tx): Promise<CreateRouteBFeedbackReviewResult> => {
    const record = await tx.theaterSession.findFirst({
      where: {
        id: sessionId,
        organizationId: session.organization.id,
        ownerId: session.user.id,
        routeBEnabled: true,
      },
      include: routeBSessionInclude,
    });

    if (!record) {
      return { status: "NOT_FOUND" };
    }

    const feedbackReview = buildTheaterRouteBFeedbackReview({
      snapshot: toRouteBSessionSnapshot(record),
      selectedPerspectiveIds: input.selectedPerspectiveIds,
      notApplicableRedLines: input.notApplicableRedLines,
    });
    const sceneState = asRecord(record.sceneState);

    await tx.theaterSession.update({
      where: { id: sessionId },
      data: {
        sceneState: toInputJson({
          ...sceneState,
          feedbackReview,
          writesConfirmedCrmFact: false,
        }),
      },
    });

    return { status: "CREATED", data: feedbackReview };
  });

  return data;
}

export async function getRouteBComplianceReviewIntakeForMember(
  session: AppSession,
  sessionId: string,
): Promise<GetRouteBComplianceReviewIntakeResult> {
  const record = await prisma.theaterSession.findFirst({
    where: {
      id: sessionId,
      organizationId: session.organization.id,
      ownerId: session.user.id,
      routeBEnabled: true,
    },
    select: {
      sceneState: true,
    },
  });

  if (!record) {
    return { status: "NOT_FOUND" };
  }

  const feedbackReview = asRecord(record.sceneState).feedbackReview;
  if (!isTheaterRouteBFeedbackReview(feedbackReview)) {
    return { status: "EMPTY" };
  }

  const intake = buildRouteBComplianceReviewIntakeFromFeedbackReview({ feedbackReview });
  if (!isRouteBComplianceReviewIntake(intake)) {
    return { status: "EMPTY" };
  }

  return { status: "OK", data: intake };
}

export async function listRouteBComplianceReviewQueueForMember(
  session: AppSession,
  options: { limit?: number } = {},
): Promise<ListRouteBComplianceReviewQueueResult> {
  const take = Math.min(Math.max(options.limit ?? 20, 1), 50);
  const records = await prisma.theaterSession.findMany({
    where: {
      organizationId: session.organization.id,
      ownerId: session.user.id,
      routeBEnabled: true,
    },
    select: {
      id: true,
      routeBSceneId: true,
      routeBSourcePacketId: true,
      clientId: true,
      sceneState: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take,
  });

  const intakes = records.flatMap((record) => {
    const feedbackReview = asRecord(record.sceneState).feedbackReview;
    if (!isTheaterRouteBFeedbackReview(feedbackReview)) return [];

    const intake = buildRouteBComplianceReviewIntakeFromFeedbackReview({ feedbackReview });
    if (!isRouteBComplianceReviewIntake(intake) || intake.candidateCount <= 0) return [];

    return [
      {
        session: {
          sessionId: record.id,
          routeBSceneId: record.routeBSceneId,
          routeBSourcePacketId: record.routeBSourcePacketId,
          clientId: record.clientId,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        },
        intake,
      },
    ];
  });

  const queue = buildRouteBComplianceReviewQueue({ intakes });
  return {
    status: "OK",
    data: isRouteBComplianceReviewQueue(queue) ? queue : buildRouteBComplianceReviewQueue({ intakes: [] }),
  };
}

export async function getRouteBRedLineActionStateForMember(
  session: AppSession,
  sessionId: string,
): Promise<GetRouteBRedLineActionStateResult> {
  const record = await prisma.theaterSession.findFirst({
    where: {
      id: sessionId,
      organizationId: session.organization.id,
      ownerId: session.user.id,
      routeBEnabled: true,
    },
    select: {
      sceneState: true,
    },
  });

  if (!record) {
    return { status: "NOT_FOUND" };
  }

  const redLineActionState = asRecord(record.sceneState).redLineActionState;
  if (isRouteBRedLineActionPersistenceState(redLineActionState)) {
    return { status: "OK", data: redLineActionState };
  }

  return { status: "OK", data: buildRouteBRedLineActionPersistenceState() };
}

export async function updateRouteBRedLineActionStateForMember(
  session: AppSession,
  sessionId: string,
  input: UpdateRouteBRedLineActionStateInput,
): Promise<UpdateRouteBRedLineActionStateResult> {
  const data = await prisma.$transaction(async (tx): Promise<UpdateRouteBRedLineActionStateResult> => {
    const record = await tx.theaterSession.findFirst({
      where: {
        id: sessionId,
        organizationId: session.organization.id,
        ownerId: session.user.id,
        routeBEnabled: true,
      },
      select: {
        sceneState: true,
      },
    });

    if (!record) {
      return { status: "NOT_FOUND" };
    }

    const redLineActionState = buildRouteBRedLineActionPersistenceState(input.records);
    const sceneState = asRecord(record.sceneState);

    await tx.theaterSession.update({
      where: { id: sessionId },
      data: {
        sceneState: toInputJson({
          ...sceneState,
          redLineActionState,
          writesConfirmedCrmFact: false,
        }),
      },
    });

    return { status: "UPDATED", data: redLineActionState };
  });

  return data;
}

export async function appendRouteBAdvisorTurnForMember(
  session: AppSession,
  sessionId: string,
  input: AppendRouteBAdvisorTurnInput,
): Promise<AppendRouteBAdvisorTurnResult> {
  const data = await prisma.$transaction(async (tx): Promise<AppendRouteBAdvisorTurnResult> => {
    const record = await tx.theaterSession.findFirst({
      where: {
        id: sessionId,
        organizationId: session.organization.id,
        ownerId: session.user.id,
        routeBEnabled: true,
      },
      include: {
        characters: true,
      },
    });

    if (!record) {
      return { status: "NOT_FOUND" };
    }

    const charactersByRouteBId = new Map(record.characters.map((character) => [character.routeBCharacterId, character]));
    const addressee =
      input.visibilityScope === "PRIVATE"
        ? charactersByRouteBId.get(input.addresseeRouteBCharacterId ?? "")
        : null;

    if (input.visibilityScope === "PRIVATE" && !addressee) {
      return { status: "INVALID_PRIVATE_ADDRESSEE" };
    }

    const turnId = `route_b_turn_${randomUUID().replaceAll("-", "")}`;
    const statePatchTarget = input.statePatch
      ? charactersByRouteBId.get(input.statePatch.targetRouteBCharacterId)
      : null;

    if (input.statePatch && !statePatchTarget) {
      return { status: "INVALID_STATE_PATCH_TARGET" };
    }

    const statePatch = input.statePatch && statePatchTarget
      ? buildTheaterRouteBStatePatch({
          targetCharacterId: statePatchTarget.routeBCharacterId,
          summary: input.statePatch.summary,
          factStatus: "INFERENCE",
          visibilityScope: input.visibilityScope,
          sourceTurnId: turnId,
        })
      : null;

    await tx.theaterTurn.create({
      data: buildRouteBTurnCreateData({
        id: turnId,
        sessionId,
        actorKind: "ADVISOR",
        content: input.content,
        visibilityScope: input.visibilityScope,
        addresseeCharacterId: addressee?.id ?? null,
        statePatches: statePatch ? [statePatch] : undefined,
        metadata: {
          source: "theater_route_b_advisor_turn",
          noProviderCall: true,
          providerCallAttempted: false,
          requiresConfirmationBeforeCrmWrite: true,
          writesConfirmedCrmFact: false,
        },
      }),
    });

    if (statePatch) {
      const sceneState = asRecord(record.sceneState);
      const statePatches = Array.isArray(sceneState.statePatches) ? sceneState.statePatches : [];

      await tx.theaterSession.update({
        where: { id: sessionId },
        data: {
          sceneState: toInputJson({
            ...sceneState,
            statePatches: [...statePatches, statePatch],
            writesConfirmedCrmFact: false,
          }),
        },
      });
    }

    const updatedRecord = await tx.theaterSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: routeBSessionInclude,
    });

    return { status: "CREATED", data: toRouteBSessionSnapshot(updatedRecord) };
  });

  return data;
}

export async function appendRouteBNextTurnCandidateForMember(
  session: AppSession,
  sessionId: string,
  input: AppendRouteBNextTurnCandidateInput,
): Promise<AppendRouteBNextTurnCandidateResult> {
  const data = await prisma.$transaction(async (tx): Promise<AppendRouteBNextTurnCandidateResult> => {
    const record = await tx.theaterSession.findFirst({
      where: {
        id: sessionId,
        organizationId: session.organization.id,
        ownerId: session.user.id,
        routeBEnabled: true,
      },
      include: {
        characters: true,
      },
    });

    if (!record) {
      return { status: "NOT_FOUND" };
    }

    const charactersByRouteBId = new Map(record.characters.map((character) => [character.routeBCharacterId, character]));
    const confirmation = buildTheaterRouteBNextTurnAppendConfirmation({
      availableRouteBCharacterIds: charactersByRouteBId.keys(),
      input,
    });

    if (confirmation.status === "REJECTED") {
      return {
        status: "INVALID_APPEND_CANDIDATE",
        errorCode: confirmation.errorCode,
        message: confirmation.message,
      };
    }

    const speaker =
      confirmation.actorKind === "CHARACTER"
        ? charactersByRouteBId.get(confirmation.speakerRouteBCharacterId ?? "")
        : null;
    const addressee = confirmation.addresseeRouteBCharacterId
      ? charactersByRouteBId.get(confirmation.addresseeRouteBCharacterId)
      : null;

    if (confirmation.actorKind === "CHARACTER" && !speaker) {
      return {
        status: "INVALID_APPEND_CANDIDATE",
        errorCode: "INVALID_CHARACTER_SPEAKER",
        message: "Route B character append requires a known speaker.",
      };
    }

    if (confirmation.visibilityScope === "PRIVATE" && !addressee) {
      return {
        status: "INVALID_APPEND_CANDIDATE",
        errorCode: "INVALID_PRIVATE_ADDRESSEE",
        message: "Route B private append requires a known addressee.",
      };
    }

    await tx.theaterTurn.create({
      data: buildRouteBTurnCreateData({
        id: `route_b_turn_${randomUUID().replaceAll("-", "")}`,
        sessionId,
        actorKind: confirmation.actorKind,
        content: confirmation.content,
        visibilityScope: confirmation.visibilityScope,
        speakerCharacterId: speaker?.id ?? null,
        addresseeCharacterId: addressee?.id ?? null,
        metadata: confirmation.metadata,
      }),
    });

    const updatedRecord = await tx.theaterSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: routeBSessionInclude,
    });

    return { status: "CREATED", data: toRouteBSessionSnapshot(updatedRecord) };
  });

  return data;
}

function toRouteBSessionSnapshot(record: RouteBSessionRecord): RouteBSessionSnapshot {
  const sceneState = asRecord(record.sceneState);
  const aiUsageLogRequiredFor = readUsageLogRequirements(record.metadata);
  const charactersById = new Map(record.characters.map((character) => [character.id, character]));

  return {
    session: {
      id: record.id,
      routeBEnabled: record.routeBEnabled,
      routeBSceneId: record.routeBSceneId,
      routeBSourcePacketId: record.routeBSourcePacketId,
      clientId: record.clientId,
      spinSessionId: record.spinSessionId,
      status: record.status,
      isDemo: record.isDemo,
      createdAt: record.createdAt.toISOString(),
      provider: {
        callsEnabled: false,
        callAttempted: false,
        usageLogWritten: false,
        usageLogRequiredFor: aiUsageLogRequiredFor,
        storesProviderBody: false,
      },
    },
    scene: {
      relationships: sanitizeJson(sceneState.relationships ?? []),
      narratorQuestions: sanitizeJson(sceneState.narratorQuestions ?? []),
      statePatchCount: Array.isArray(sceneState.statePatches) ? sceneState.statePatches.length : 0,
      visibilityRules: sanitizeJson(record.visibilityRules ?? []),
      redLineActionState: isRouteBRedLineActionPersistenceState(sceneState.redLineActionState)
        ? sceneState.redLineActionState
        : buildRouteBRedLineActionPersistenceState(),
    },
    characters: record.characters.map((character) => ({
      id: character.id,
      routeBCharacterId: character.routeBCharacterId,
      role: character.role,
      displayName: sanitizeRouteBText(character.displayName),
      isFocus: character.isFocus,
      publicBrief: sanitizeRouteBText(character.publicBrief),
      knownFacts: sanitizeJson(character.knownFacts ?? []),
      personaHints: sanitizeJson(character.personaHints ?? []),
      unknowns: sanitizeJson(character.unknowns ?? []),
      exemplarLines: sanitizeJson(character.exemplarLines ?? []),
      statePatchCount: readStatePatchCount(character.privateState),
    })),
    turns: record.turns.map((turn) => ({
      id: turn.id,
      role: readRouteBActorKind(turn.metadata, turn.role, turn.visibilityScope),
      speakerRouteBCharacterId: turn.speakerCharacter?.routeBCharacterId ?? null,
      addresseeRouteBCharacterId: turn.addresseeCharacter?.routeBCharacterId ?? null,
      visibilityScope: turn.visibilityScope,
      content: sanitizeRouteBText(turn.content),
      statePatchCount: readStatePatchCount(turn.statePatches),
      createdAt: turn.createdAt.toISOString(),
    })),
    visibilityProof: {
      ownerOnlyRead: true,
      scopedTurnColumnsPersisted: record.characters.every((character) => charactersById.has(character.id)),
      thirdPartyVisibleForDirectMessage: false,
    },
  };
}

function readUsageLogRequirements(value: Prisma.JsonValue | null): string[] {
  const metadata = asRecord(value);
  const aiUsagePlan = asRecord(metadata.aiUsagePlan);
  const calls = Array.isArray(aiUsagePlan.calls) ? aiUsagePlan.calls : [];

  return calls
    .map((call) => asRecord(call).kind)
    .filter((kind): kind is string => typeof kind === "string" && kind.length > 0);
}

function readStatePatchCount(value: Prisma.JsonValue | null): number {
  const record = asRecord(value);
  if (Array.isArray(record.statePatches)) return record.statePatches.length;
  if (Array.isArray(value)) return value.length;
  return 0;
}

function readRouteBActorKind(metadataValue: Prisma.JsonValue | null, fallbackRole: string, visibilityScope: string | null): string {
  const actorKind = asRecord(metadataValue).actorKind;
  if (actorKind === "ADVISOR" || actorKind === "DIRECTOR" || actorKind === "CHARACTER" || actorKind === "NARRATOR") {
    return actorKind;
  }
  if (fallbackRole === "AGENT") return "ADVISOR";
  if (fallbackRole === "CLIENT") return "CHARACTER";
  if (fallbackRole === "SYSTEM" && visibilityScope === "DIRECTOR_ONLY") return "DIRECTOR";
  if (fallbackRole === "SYSTEM") return "NARRATOR";
  return fallbackRole;
}

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function sanitizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJson(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !isUnsafeKey(key))
        .map(([key, item]) => [key, sanitizeJson(item)]),
    );
  }

  if (typeof value === "string") {
    return sanitizeRouteBText(value);
  }

  return value;
}

function isUnsafeKey(key: string): boolean {
  return /(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment)/i.test(key);
}

function sanitizeRouteBText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[removed]")
    .replace(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, "[removed]")
    .replace(/\b(rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment)\b/gi, "[removed]")
    .trim();
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
