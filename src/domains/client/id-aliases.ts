import type { Client } from "./types";

const LEGACY_DEMO_CLIENT_ID_ALIASES: Record<string, string> = {
  c_chang: "demo_client_chang",
  c_chen: "demo_client_chen",
  c_chu: "demo_client_chu",
  c_huang: "demo_client_huang",
  c_lee: "demo_client_lee",
  c_lin: "demo_client_lin",
  c_lo: "demo_client_lo",
  c_tsai: "demo_client_tsai",
  c_wu: "demo_client_wu",
};

export function resolveClientIdAlias(clientId: string) {
  return LEGACY_DEMO_CLIENT_ID_ALIASES[clientId] ?? clientId;
}

export function resolveClientFromList(clients: Client[], clientId: string | null | undefined) {
  if (!clientId) return undefined;

  const aliasedClientId = resolveClientIdAlias(clientId);
  const legacyClientId = Object.entries(LEGACY_DEMO_CLIENT_ID_ALIASES).find(
    ([, currentClientId]) => currentClientId === clientId,
  )?.[0];

  return (
    clients.find((client) => client.id === clientId) ??
    clients.find((client) => client.id === aliasedClientId) ??
    clients.find((client) => client.id === legacyClientId)
  );
}
