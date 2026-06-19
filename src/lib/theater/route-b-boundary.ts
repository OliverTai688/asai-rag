import type { TheaterRouteBHandoffPacket } from "@/domains/theater/route-b-handoff";

export function validateRouteBHandoffBoundary(handoff: TheaterRouteBHandoffPacket): string | undefined {
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

export function isTheaterRouteBHandoffPacket(value: unknown): value is TheaterRouteBHandoffPacket {
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
