"use client";

import { useEffect, useState } from "react";
import type { ClientRelatedListsDto } from "@/domains/client/related-lists";

export function useClientRelatedLists(clientId: string) {
  const [data, setData] = useState<ClientRelatedListsDto | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(clientId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRelatedLists() {
      if (!clientId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}/related-lists`, {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : `CLIENT_RELATED_LISTS_${response.status}`;
          throw new Error(message);
        }

        if (!cancelled) {
          setData(payload as ClientRelatedListsDto);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "CLIENT_RELATED_LISTS_LOAD_FAILED");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRelatedLists();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return { data, isLoading, error };
}
