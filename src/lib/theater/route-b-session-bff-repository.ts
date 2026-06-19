import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { ClientSensitivity, InteractionEventType } from "@/generated/prisma/enums";
import type { TheaterRouteBHandoffPacket } from "@/domains/theater/route-b-handoff";
import { canReadClientDetail } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { persistRouteBHandoffDraft } from "@/lib/theater/route-b-session-repository";

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

export type RouteBSessionSnapshot = {
  session: {
    id: string;
    routeBEnabled: boolean;
    routeBSceneId: string | null;
    routeBSourcePacketId: string | null;
    clientId: string | null;
    spinSessionId: string | null;
    status: string;
    isDemo: boolean;
    createdAt: string;
    provider: {
      callsEnabled: false;
      callAttempted: false;
      usageLogWritten: false;
      usageLogRequiredFor: string[];
      storesProviderBody: false;
    };
  };
  scene: {
    relationships: unknown;
    narratorQuestions: unknown;
    statePatchCount: number;
    visibilityRules: unknown;
  };
  characters: Array<{
    id: string;
    routeBCharacterId: string;
    role: string;
    displayName: string;
    isFocus: boolean;
    publicBrief: string;
    knownFacts: unknown;
    personaHints: unknown;
    unknowns: unknown;
    exemplarLines: unknown;
    statePatchCount: number;
  }>;
  turns: Array<{
    id: string;
    role: string;
    speakerRouteBCharacterId: string | null;
    addresseeRouteBCharacterId: string | null;
    visibilityScope: string | null;
    content: string;
    statePatchCount: number;
    createdAt: string;
  }>;
  visibilityProof: {
    ownerOnlyRead: true;
    scopedTurnColumnsPersisted: boolean;
    thirdPartyVisibleForDirectMessage: false;
  };
};

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
      role: turn.role,
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
