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

export type VisitReminderNotificationInput = {
  planId: string;
  agentEmail?: string;
};

export type VisitReminderNotificationDisabledDto = {
  version: "asai.notifications.visit_reminder.v1";
  generatedAt: string;
  status: "disabled";
  source: "guarded_disabled";
  request: {
    planId: string;
    previewPath: string;
    recipientAccepted: boolean;
    recipientEchoed: false;
  };
  delivery: {
    channel: "email";
    provider: "none";
    enabled: false;
    providerAttempted: false;
    jobQueued: false;
    realEmailSent: false;
    realNotificationSent: false;
    reason: string;
  };
  proof: {
    requiresAuthenticatedWorkspace: true;
    triggersExternalNotification: false;
    providerCallAttempted: false;
    aiUsageLogRequired: false;
    storesRawProviderPayload: false;
    storesRawPrivateTranscript: false;
    writesDatabase: false;
    mockSuccess: false;
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

export function buildDisabledVisitReminderNotificationDto(
  input: VisitReminderNotificationInput,
  now = new Date(),
): VisitReminderNotificationDisabledDto {
  return {
    version: "asai.notifications.visit_reminder.v1",
    generatedAt: now.toISOString(),
    status: "disabled",
    source: "guarded_disabled",
    request: {
      planId: input.planId,
      previewPath: `/pre-visit/${encodeURIComponent(input.planId)}`,
      recipientAccepted: Boolean(input.agentEmail),
      recipientEchoed: false,
    },
    delivery: {
      channel: "email",
      provider: "none",
      enabled: false,
      providerAttempted: false,
      jobQueued: false,
      realEmailSent: false,
      realNotificationSent: false,
      reason:
        "Visit reminder delivery is disabled until notification provider env, sender policy, job queue, idempotency, and production proof are explicitly completed.",
    },
    proof: {
      requiresAuthenticatedWorkspace: true,
      triggersExternalNotification: false,
      providerCallAttempted: false,
      aiUsageLogRequired: false,
      storesRawProviderPayload: false,
      storesRawPrivateTranscript: false,
      writesDatabase: false,
      mockSuccess: false,
    },
  };
}
