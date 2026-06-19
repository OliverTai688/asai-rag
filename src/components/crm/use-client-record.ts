"use client";

import { useEffect, useState } from "react";
import { clientService } from "@/domains/client/service";
import { useClientStore } from "@/domains/client/store";

export function useClientRecord(clientId: string) {
  const client = useClientStore((state) => state.getClientById(clientId));
  const [isLoading, setIsLoading] = useState(!client);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadClient() {
      try {
        setIsLoading(true);
        setError(null);
        await clientService.fetchClientById(clientId);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "CLIENT_LOAD_FAILED");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (clientId) {
      void loadClient();
    }

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return { client, isLoading, error };
}
