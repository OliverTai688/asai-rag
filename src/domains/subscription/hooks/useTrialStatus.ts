import { useState, useEffect } from 'react';

export interface TrialStatus {
  hasTrial: boolean;
  daysRemaining: number;
  isExpired: boolean;
  plan: string;
}

export function useTrialStatus(organizationId?: string) {
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(organizationId));

  useEffect(() => {
    if (!organizationId) return;

    let isActive = true;

    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        // This endpoint will be built to return trial info based on the DB Schema
        const res = await fetch(`/api/subscription/trial-status?orgId=${organizationId}`);
        if (res.ok) {
          const data = await res.json();
          if (isActive) {
            setStatus(data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch trial status', error);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void fetchStatus();

    return () => {
      isActive = false;
    };
  }, [organizationId]);

  return { status: organizationId ? status : null, isLoading: organizationId ? isLoading : false };
}
