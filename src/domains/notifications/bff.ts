export type NotificationsBffDto = {
  version: "asai.notifications.bff.v1";
  generatedAt: string;
  source: "disabled_no_delivery";
  notifications: [];
  unreadCount: 0;
  delivery: {
    enabled: false;
    providerAttempted: false;
    realNotificationSent: false;
    reason: string;
  };
  proof: {
    requiresAuthenticatedWorkspaceForPrivateNotifications: true;
    triggersExternalNotification: false;
    providerCallAttempted: false;
    aiUsageLogRequired: false;
    storesRawProviderPayload: false;
    storesRawPrivateTranscript: false;
  };
};

export function buildDisabledNotificationsBffDto(now = new Date()): NotificationsBffDto {
  return {
    version: "asai.notifications.bff.v1",
    generatedAt: now.toISOString(),
    source: "disabled_no_delivery",
    notifications: [],
    unreadCount: 0,
    delivery: {
      enabled: false,
      providerAttempted: false,
      realNotificationSent: false,
      reason:
        "Real notification delivery is disabled until provider env, delivery policy, and production proof are explicitly completed.",
    },
    proof: {
      requiresAuthenticatedWorkspaceForPrivateNotifications: true,
      triggersExternalNotification: false,
      providerCallAttempted: false,
      aiUsageLogRequired: false,
      storesRawProviderPayload: false,
      storesRawPrivateTranscript: false,
    },
  };
}
