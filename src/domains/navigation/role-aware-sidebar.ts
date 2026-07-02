export type SidebarSurface = "member" | "orgAdmin" | "platform" | "clientPortal";
export type SidebarSessionType = "app" | "client" | "platform" | "token";

export type OrganizationRole =
  | "ORG_OWNER"
  | "ORG_ADMIN"
  | "MANAGER"
  | "MEMBER"
  | "COLLABORATOR";

export type PlatformRole = "SUPER_ADMIN" | "SUPPORT" | "FINANCE";
export type ClientRole = "CLIENT_OWNER" | "CLIENT_MEMBER" | "CLIENT_VIEWER";

export type SidebarBadge = "beta" | "legacy" | "upgrade" | "internal";
export type SidebarVisibilityStrategy = "show" | "hide" | "disable" | "teaser" | "switch";

export type SidebarDisabledReason =
  | "AI_DISABLED"
  | "PLAN_UPGRADE_REQUIRED"
  | "QUOTA_EXCEEDED"
  | "FEATURE_FLAG_OFF"
  | "ROLE_RESTRICTED"
  | "UNIT_SCOPE_REQUIRED"
  | "SURFACE_MISMATCH";

export type SidebarPolicyKey =
  | "canReadMemberHome"
  | "canUseScopedAssistant"
  | "canUseAiModule"
  | "canReadOwnOrAssignedClientWork"
  | "canReadOwnReports"
  | "canReadIssues"
  | "canReadOrgAggregate"
  | "canManageOrgSettings"
  | "canManageBilling"
  | "canAccessPlatformTool"
  | "canReadClientPortal";

export type SidebarDataBoundary =
  | "member-own-assigned"
  | "member-own-assigned-summary"
  | "org-aggregate"
  | "org-settings"
  | "platform-metadata"
  | "platform-audit"
  | "client-authorized"
  | "public-token";

export type SidebarActionType = "openAssistant" | "switchSurface";

export interface SidebarAction {
  readonly type: SidebarActionType;
  readonly targetSurface?: SidebarSurface;
  readonly assistantScope?:
    | "member-own-assigned"
    | "org-aggregate"
    | "platform-metadata"
    | "client-safe";
}

export interface SidebarPlanCapabilities {
  readonly aiEnabled: boolean;
  readonly clientPortalEnabled: boolean;
  readonly shareBrandingEnabled: boolean;
  readonly orgAdminEnabled: boolean;
  readonly billingEnabled: boolean;
  readonly maxUnits: number;
}

export interface SidebarFeatureFlags {
  readonly legacySpinNav: boolean;
  readonly interviewEnabled: boolean;
  readonly theaterEnabled: boolean;
  readonly orgAdminBeta: boolean;
  readonly clientPortalBeta: boolean;
}

export interface SidebarContext {
  readonly sessionType: SidebarSessionType;
  readonly surface: SidebarSurface;
  readonly organizationRole?: OrganizationRole;
  readonly platformRole?: PlatformRole;
  readonly clientRole?: ClientRole;
  readonly managedUnitIds: readonly string[];
  readonly planCapabilities: SidebarPlanCapabilities;
  readonly featureFlags: SidebarFeatureFlags;
  readonly isDemo: boolean;
}

export interface SidebarItemBase {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly icon: string;
  readonly ariaLabel: string;
  readonly visible: boolean;
  readonly disabled?: boolean;
  readonly disabledReason?: SidebarDisabledReason;
  readonly badge?: SidebarBadge;
  readonly visibilityStrategy: SidebarVisibilityStrategy;
  readonly policy: SidebarPolicyKey;
  readonly dataBoundary: SidebarDataBoundary;
  readonly organizationRoles?: readonly OrganizationRole[];
  readonly platformRoles?: readonly PlatformRole[];
  readonly clientRoles?: readonly ClientRole[];
  readonly requiresCapability?: keyof SidebarPlanCapabilities;
  readonly requiresFeatureFlag?: keyof SidebarFeatureFlags;
}

export interface SidebarLinkItem extends SidebarItemBase {
  readonly kind: "link";
  readonly href: string;
  readonly action?: never;
}

export interface SidebarActionItem extends SidebarItemBase {
  readonly kind: "action";
  readonly action: SidebarAction;
  readonly href?: never;
}

export type SidebarItem = SidebarLinkItem | SidebarActionItem;

export interface SidebarSection {
  readonly id: string;
  readonly label: string;
  readonly priority: number;
  readonly items: readonly SidebarItem[];
}

export interface SidebarManifest {
  readonly surface: SidebarSurface;
  readonly label: string;
  readonly defaultSessionType: SidebarSessionType;
  readonly dataBoundary: SidebarDataBoundary;
  readonly sections: readonly SidebarSection[];
  readonly notes: readonly string[];
}

export interface ResolvedSidebarItemResolution {
  readonly sourceVisible: boolean;
  readonly policyAllowed: boolean;
  readonly roleAllowed: boolean;
  readonly capabilityAllowed: boolean;
  readonly featureAllowed: boolean;
  readonly sessionAllowed: boolean;
}

export type ResolvedSidebarItem = SidebarItem & {
  readonly visible: true;
  readonly disabled: boolean;
  readonly disabledReason?: SidebarDisabledReason;
  readonly resolution: ResolvedSidebarItemResolution;
};

export interface ResolvedSidebarSection {
  readonly id: string;
  readonly label: string;
  readonly priority: number;
  readonly items: readonly ResolvedSidebarItem[];
}

export const sidebarContextRequiredFields = [
  "sessionType",
  "surface",
  "organizationRole",
  "platformRole",
  "clientRole",
  "managedUnitIds",
  "planCapabilities",
  "featureFlags",
  "isDemo",
] as const;

const allOrgRoles = [
  "ORG_OWNER",
  "ORG_ADMIN",
  "MANAGER",
  "MEMBER",
  "COLLABORATOR",
] as const satisfies readonly OrganizationRole[];

const orgAdminRoles = [
  "ORG_OWNER",
  "ORG_ADMIN",
] as const satisfies readonly OrganizationRole[];

const managerPlusRoles = [
  "ORG_OWNER",
  "ORG_ADMIN",
  "MANAGER",
] as const satisfies readonly OrganizationRole[];

const platformRoles = [
  "SUPER_ADMIN",
  "SUPPORT",
  "FINANCE",
] as const satisfies readonly PlatformRole[];

const clientRoles = [
  "CLIENT_OWNER",
  "CLIENT_MEMBER",
  "CLIENT_VIEWER",
] as const satisfies readonly ClientRole[];

export const memberSidebarManifest = {
  surface: "member",
  label: "顧問工作台",
  defaultSessionType: "app",
  dataBoundary: "member-own-assigned",
  notes: [
    "Member surface keeps AI-first navigation from RES-008.",
    "Team and organization settings require role-aware resolver filtering; sidebar visibility is not a data guard.",
    "SPIN 舊版 is present only as a hidden legacy draft item and requires legacySpinNav.",
  ],
  sections: [
    {
      id: "today",
      label: "今日",
      priority: 10,
      items: [
        {
          kind: "link",
          id: "dashboard",
          label: "總覽",
          href: "/dashboard",
          icon: "LayoutDashboard",
          ariaLabel: "前往今日總覽",
          visible: true,
          visibilityStrategy: "show",
          policy: "canReadMemberHome",
          dataBoundary: "member-own-assigned-summary",
          organizationRoles: allOrgRoles,
        },
      ],
    },
    {
      id: "ai-workbench",
      label: "AI 工作台",
      priority: 20,
      items: [
        {
          kind: "action",
          id: "ask-asai",
          label: "問誠問 AI",
          description: "問網站、客戶與下一步",
          icon: "Bot",
          ariaLabel: "開啟誠問 AI 助手",
          action: {
            type: "openAssistant",
            assistantScope: "member-own-assigned",
          },
          visible: true,
          visibilityStrategy: "show",
          policy: "canUseScopedAssistant",
          dataBoundary: "member-own-assigned-summary",
          organizationRoles: allOrgRoles,
          requiresCapability: "aiEnabled",
        },
        {
          kind: "link",
          id: "ai-understand-client",
          label: "AI 了解客戶",
          description: "訪談業務員、整理準備",
          href: "/interview",
          icon: "MessageSquare",
          ariaLabel: "前往 AI 了解客戶",
          visible: true,
          visibilityStrategy: "show",
          policy: "canUseAiModule",
          dataBoundary: "member-own-assigned-summary",
          organizationRoles: allOrgRoles,
          requiresCapability: "aiEnabled",
          requiresFeatureFlag: "interviewEnabled",
        },
        {
          kind: "link",
          id: "ai-theater",
          label: "AI 劇場演練",
          description: "練異議、角色與說法",
          href: "/theater",
          icon: "Theater",
          ariaLabel: "前往 AI 劇場演練",
          visible: true,
          visibilityStrategy: "show",
          policy: "canUseAiModule",
          dataBoundary: "member-own-assigned-summary",
          organizationRoles: allOrgRoles,
          requiresCapability: "aiEnabled",
          requiresFeatureFlag: "theaterEnabled",
        },
        {
          kind: "link",
          id: "legacy-spin",
          label: "SPIN 舊版",
          description: "遷移期相容入口",
          href: "/spin",
          icon: "MessageSquareText",
          ariaLabel: "前往 SPIN 舊版",
          visible: false,
          visibilityStrategy: "hide",
          badge: "legacy",
          policy: "canUseAiModule",
          dataBoundary: "member-own-assigned-summary",
          organizationRoles: allOrgRoles,
          requiresCapability: "aiEnabled",
          requiresFeatureFlag: "legacySpinNav",
        },
      ],
    },
    {
      id: "client-work",
      label: "客戶工作",
      priority: 30,
      items: [
        {
          kind: "link",
          id: "clients",
          label: "客戶管理",
          href: "/crm",
          icon: "Users",
          ariaLabel: "前往客戶管理",
          visible: true,
          visibilityStrategy: "show",
          policy: "canReadOwnOrAssignedClientWork",
          dataBoundary: "member-own-assigned",
          organizationRoles: allOrgRoles,
        },
        {
          kind: "link",
          id: "pre-visit",
          label: "訪前規劃",
          href: "/pre-visit",
          icon: "CalendarDays",
          ariaLabel: "前往訪前規劃",
          visible: true,
          visibilityStrategy: "show",
          policy: "canReadOwnOrAssignedClientWork",
          dataBoundary: "member-own-assigned",
          organizationRoles: allOrgRoles,
        },
        {
          kind: "link",
          id: "reports",
          label: "分析報告",
          href: "/reports",
          icon: "FileText",
          ariaLabel: "前往分析報告",
          visible: true,
          visibilityStrategy: "show",
          policy: "canReadOwnReports",
          dataBoundary: "member-own-assigned",
          organizationRoles: allOrgRoles,
        },
        {
          kind: "link",
          id: "issues",
          label: "議題單",
          href: "/issues",
          icon: "CircleAlert",
          ariaLabel: "前往議題單",
          visible: false,
          visibilityStrategy: "hide",
          policy: "canReadIssues",
          dataBoundary: "member-own-assigned-summary",
          organizationRoles: allOrgRoles,
        },
      ],
    },
    {
      id: "team-system",
      label: "團隊與系統",
      priority: 40,
      items: [
        {
          kind: "link",
          id: "team",
          label: "團隊管理",
          href: "/team",
          icon: "Users2",
          ariaLabel: "前往團隊管理",
          visible: true,
          visibilityStrategy: "hide",
          policy: "canReadOrgAggregate",
          dataBoundary: "org-aggregate",
          organizationRoles: managerPlusRoles,
          requiresCapability: "orgAdminEnabled",
        },
        {
          kind: "link",
          id: "team-settings",
          label: "通訊處設定",
          href: "/team/settings",
          icon: "Building2",
          ariaLabel: "前往通訊處設定",
          visible: true,
          visibilityStrategy: "hide",
          policy: "canManageOrgSettings",
          dataBoundary: "org-settings",
          organizationRoles: orgAdminRoles,
          requiresCapability: "orgAdminEnabled",
        },
        {
          kind: "link",
          id: "settings",
          label: "個人設定",
          href: "/settings",
          icon: "Settings",
          ariaLabel: "前往個人設定",
          visible: true,
          visibilityStrategy: "show",
          policy: "canReadMemberHome",
          dataBoundary: "member-own-assigned-summary",
          organizationRoles: allOrgRoles,
        },
      ],
    },
  ],
} as const satisfies SidebarManifest;

export const orgAdminSidebarManifest = {
  surface: "orgAdmin",
  label: "通訊處管理",
  defaultSessionType: "app",
  dataBoundary: "org-aggregate",
  notes: [
    "Org admin surface is aggregate-first and must not expose member client detail routes.",
    "Manager entries are scoped to managedUnitIds and remain read-only or limited write until route guards prove otherwise.",
    "Surface switch returns to member workbench instead of mixing every member route into org admin navigation.",
  ],
  sections: [
    {
      id: "team-overview",
      label: "團隊總覽",
      priority: 10,
      items: [
        {
          kind: "link",
          id: "org-home",
          label: "管理首頁",
          href: "/team",
          icon: "LayoutDashboard",
          ariaLabel: "前往通訊處管理首頁",
          visible: true,
          visibilityStrategy: "show",
          policy: "canReadOrgAggregate",
          dataBoundary: "org-aggregate",
          organizationRoles: managerPlusRoles,
        },
        {
          kind: "link",
          id: "coaching-queue",
          label: "輔導隊列",
          href: "/team/coaching",
          icon: "ListChecks",
          ariaLabel: "前往輔導隊列",
          visible: true,
          visibilityStrategy: "show",
          policy: "canReadOrgAggregate",
          dataBoundary: "org-aggregate",
          organizationRoles: managerPlusRoles,
        },
        {
          kind: "link",
          id: "member-health",
          label: "成員健康度",
          href: "/team/members",
          icon: "Users2",
          ariaLabel: "前往成員健康度",
          visible: true,
          visibilityStrategy: "show",
          policy: "canReadOrgAggregate",
          dataBoundary: "org-aggregate",
          organizationRoles: managerPlusRoles,
        },
      ],
    },
    {
      id: "org-management",
      label: "組織管理",
      priority: 20,
      items: [
        {
          kind: "link",
          id: "seats",
          label: "成員與席次",
          href: "/team/seats",
          icon: "UserCog",
          ariaLabel: "前往成員與席次",
          visible: true,
          visibilityStrategy: "hide",
          policy: "canManageOrgSettings",
          dataBoundary: "org-settings",
          organizationRoles: orgAdminRoles,
        },
        {
          kind: "link",
          id: "units",
          label: "單位架構",
          href: "/team/units",
          icon: "Network",
          ariaLabel: "前往單位架構",
          visible: true,
          visibilityStrategy: "hide",
          policy: "canManageOrgSettings",
          dataBoundary: "org-settings",
          organizationRoles: orgAdminRoles,
          requiresCapability: "orgAdminEnabled",
        },
        {
          kind: "link",
          id: "invites",
          label: "邀請與角色",
          href: "/team/invites",
          icon: "Send",
          ariaLabel: "前往邀請與角色",
          visible: true,
          visibilityStrategy: "hide",
          policy: "canManageOrgSettings",
          dataBoundary: "org-settings",
          organizationRoles: orgAdminRoles,
        },
      ],
    },
    {
      id: "ai-usage",
      label: "AI 與用量",
      priority: 30,
      items: [
        {
          kind: "action",
          id: "org-ask-asai",
          label: "問誠問 AI",
          description: "問團隊彙總與輔導線索",
          icon: "Bot",
          ariaLabel: "以通訊處範圍開啟誠問 AI 助手",
          action: {
            type: "openAssistant",
            assistantScope: "org-aggregate",
          },
          visible: true,
          visibilityStrategy: "show",
          policy: "canUseScopedAssistant",
          dataBoundary: "org-aggregate",
          organizationRoles: managerPlusRoles,
          requiresCapability: "aiEnabled",
        },
        {
          kind: "link",
          id: "ai-usage-summary",
          label: "AI 用量",
          href: "/team/ai-usage",
          icon: "Gauge",
          ariaLabel: "前往 AI 用量",
          visible: true,
          visibilityStrategy: "show",
          policy: "canReadOrgAggregate",
          dataBoundary: "org-aggregate",
          organizationRoles: managerPlusRoles,
        },
        {
          kind: "link",
          id: "coverage",
          label: "劇場/訪談覆蓋率",
          href: "/team/coverage",
          icon: "Activity",
          ariaLabel: "前往劇場與訪談覆蓋率",
          visible: true,
          visibilityStrategy: "show",
          policy: "canReadOrgAggregate",
          dataBoundary: "org-aggregate",
          organizationRoles: managerPlusRoles,
        },
      ],
    },
    {
      id: "org-settings",
      label: "設定",
      priority: 40,
      items: [
        {
          kind: "link",
          id: "org-settings",
          label: "通訊處設定",
          href: "/team/settings",
          icon: "Building2",
          ariaLabel: "前往通訊處設定",
          visible: true,
          visibilityStrategy: "hide",
          policy: "canManageOrgSettings",
          dataBoundary: "org-settings",
          organizationRoles: orgAdminRoles,
        },
        {
          kind: "link",
          id: "billing",
          label: "帳務與方案",
          href: "/team/billing",
          icon: "CreditCard",
          ariaLabel: "前往帳務與方案",
          visible: true,
          visibilityStrategy: "hide",
          policy: "canManageBilling",
          dataBoundary: "org-settings",
          organizationRoles: orgAdminRoles,
          requiresCapability: "billingEnabled",
        },
        {
          kind: "action",
          id: "switch-member",
          label: "回到顧問工作台",
          icon: "ArrowLeftRight",
          ariaLabel: "切換到顧問工作台",
          action: {
            type: "switchSurface",
            targetSurface: "member",
          },
          visible: true,
          visibilityStrategy: "switch",
          policy: "canReadMemberHome",
          dataBoundary: "member-own-assigned-summary",
          organizationRoles: managerPlusRoles,
        },
      ],
    },
  ],
} as const satisfies SidebarManifest;

export const platformSidebarManifest = {
  surface: "platform",
  label: "平台營運",
  defaultSessionType: "platform",
  dataBoundary: "platform-metadata",
  notes: [
    "Platform navigation belongs to platform session only.",
    "Support/finance access must remain metadata or aggregate by default; sensitive read needs break-glass/audit policy.",
    "No member CRM or org detail routes are part of the platform sidebar family.",
  ],
  sections: [
    {
      id: "platform-overview",
      label: "平台總覽",
      priority: 10,
      items: [
        {
          kind: "link",
          id: "tenant-health",
          label: "Tenant health",
          href: "/super-admin",
          icon: "Activity",
          ariaLabel: "前往平台總覽",
          visible: true,
          visibilityStrategy: "show",
          policy: "canAccessPlatformTool",
          dataBoundary: "platform-metadata",
          platformRoles,
        },
        {
          kind: "link",
          id: "risk-events",
          label: "異常與風險",
          href: "/super-admin/risk",
          icon: "TriangleAlert",
          ariaLabel: "前往異常與風險",
          visible: true,
          visibilityStrategy: "show",
          policy: "canAccessPlatformTool",
          dataBoundary: "platform-metadata",
          platformRoles,
        },
      ],
    },
    {
      id: "operations",
      label: "營運管理",
      priority: 20,
      items: [
        {
          kind: "link",
          id: "organizations",
          label: "Organizations",
          href: "/super-admin/organizations",
          icon: "Building2",
          ariaLabel: "前往 Organizations",
          visible: true,
          visibilityStrategy: "show",
          policy: "canAccessPlatformTool",
          dataBoundary: "platform-metadata",
          platformRoles,
        },
        {
          kind: "link",
          id: "users",
          label: "Users / memberships",
          href: "/super-admin/users",
          icon: "Users2",
          ariaLabel: "前往 Users and memberships",
          visible: true,
          visibilityStrategy: "show",
          policy: "canAccessPlatformTool",
          dataBoundary: "platform-metadata",
          platformRoles,
        },
        {
          kind: "link",
          id: "plans",
          label: "Plans / feature flags",
          href: "/super-admin/plans",
          icon: "SlidersHorizontal",
          ariaLabel: "前往 Plans and feature flags",
          visible: true,
          visibilityStrategy: "hide",
          policy: "canAccessPlatformTool",
          dataBoundary: "platform-audit",
          platformRoles: ["SUPER_ADMIN"],
          badge: "internal",
        },
        {
          kind: "link",
          id: "billing-reconcile",
          label: "Billing reconciliation",
          href: "/super-admin/billing",
          icon: "ReceiptText",
          ariaLabel: "前往 Billing reconciliation",
          visible: true,
          visibilityStrategy: "hide",
          policy: "canAccessPlatformTool",
          dataBoundary: "platform-audit",
          platformRoles: ["SUPER_ADMIN", "FINANCE"],
        },
      ],
    },
    {
      id: "ai-cost",
      label: "AI 與成本",
      priority: 30,
      items: [
        {
          kind: "link",
          id: "ai-usage",
          label: "AiUsageLog aggregate",
          href: "/super-admin/ai-usage",
          icon: "Gauge",
          ariaLabel: "前往 AiUsageLog aggregate",
          visible: true,
          visibilityStrategy: "show",
          policy: "canAccessPlatformTool",
          dataBoundary: "platform-metadata",
          platformRoles,
        },
        {
          kind: "link",
          id: "provider-status",
          label: "Provider status",
          href: "/super-admin/providers",
          icon: "RadioTower",
          ariaLabel: "前往 Provider status",
          visible: true,
          visibilityStrategy: "show",
          policy: "canAccessPlatformTool",
          dataBoundary: "platform-metadata",
          platformRoles: ["SUPER_ADMIN", "SUPPORT"],
        },
      ],
    },
    {
      id: "support-audit",
      label: "支援與稽核",
      priority: 40,
      items: [
        {
          kind: "link",
          id: "support-cases",
          label: "Support cases",
          href: "/super-admin/support",
          icon: "LifeBuoy",
          ariaLabel: "前往 Support cases",
          visible: true,
          visibilityStrategy: "show",
          policy: "canAccessPlatformTool",
          dataBoundary: "platform-metadata",
          platformRoles: ["SUPER_ADMIN", "SUPPORT"],
        },
        {
          kind: "link",
          id: "impersonation",
          label: "Impersonation",
          href: "/super-admin/impersonation",
          icon: "ShieldAlert",
          ariaLabel: "前往 Impersonation",
          visible: true,
          visibilityStrategy: "hide",
          policy: "canAccessPlatformTool",
          dataBoundary: "platform-audit",
          platformRoles: ["SUPER_ADMIN"],
          badge: "internal",
        },
        {
          kind: "link",
          id: "audit-logs",
          label: "Audit logs",
          href: "/super-admin/audit-logs",
          icon: "ScrollText",
          ariaLabel: "前往 Audit logs",
          visible: true,
          visibilityStrategy: "show",
          policy: "canAccessPlatformTool",
          dataBoundary: "platform-audit",
          platformRoles,
        },
      ],
    },
  ],
} as const satisfies SidebarManifest;

export const clientPortalSidebarManifest = {
  surface: "clientPortal",
  label: "客戶入口",
  defaultSessionType: "client",
  dataBoundary: "client-authorized",
  notes: [
    "Client portal is mobile-first and can be rendered as compact sidebar, top nav, or bottom nav.",
    "Client portal never exposes internal CRM, team, AI prompt, coaching, or theater controls.",
    "Token viewers use public-token boundary and must not be upgraded into app sessions.",
  ],
  sections: [
    {
      id: "client-main",
      label: "主要",
      priority: 10,
      items: [
        {
          kind: "link",
          id: "client-reports",
          label: "報告",
          href: "/client/reports",
          icon: "FileText",
          ariaLabel: "前往我的報告",
          visible: true,
          visibilityStrategy: "show",
          policy: "canReadClientPortal",
          dataBoundary: "client-authorized",
          clientRoles,
        },
        {
          kind: "link",
          id: "client-appointments",
          label: "預約",
          href: "/client/appointments",
          icon: "CalendarDays",
          ariaLabel: "前往預約",
          visible: true,
          visibilityStrategy: "show",
          policy: "canReadClientPortal",
          dataBoundary: "client-authorized",
          clientRoles,
        },
        {
          kind: "link",
          id: "client-intake",
          label: "補資料",
          href: "/client/intake",
          icon: "ClipboardList",
          ariaLabel: "前往補資料",
          visible: true,
          visibilityStrategy: "show",
          policy: "canReadClientPortal",
          dataBoundary: "client-authorized",
          clientRoles,
        },
        {
          kind: "link",
          id: "client-privacy",
          label: "隱私與授權",
          href: "/client/privacy",
          icon: "ShieldCheck",
          ariaLabel: "前往隱私與授權",
          visible: true,
          visibilityStrategy: "show",
          policy: "canReadClientPortal",
          dataBoundary: "client-authorized",
          clientRoles,
        },
      ],
    },
  ],
} as const satisfies SidebarManifest;

export const roleAwareSidebarManifests = {
  member: memberSidebarManifest,
  orgAdmin: orgAdminSidebarManifest,
  platform: platformSidebarManifest,
  clientPortal: clientPortalSidebarManifest,
} as const satisfies Record<SidebarSurface, SidebarManifest>;

const organizationRoleRank = {
  ORG_OWNER: 5,
  ORG_ADMIN: 4,
  MANAGER: 3,
  MEMBER: 2,
  COLLABORATOR: 1,
} as const satisfies Record<OrganizationRole, number>;

function hasOrganizationRole(context: SidebarContext): context is SidebarContext & {
  readonly organizationRole: OrganizationRole;
} {
  return Boolean(context.organizationRole);
}

function hasPlatformRole(context: SidebarContext): context is SidebarContext & {
  readonly platformRole: PlatformRole;
} {
  return Boolean(context.platformRole);
}

function hasClientRole(context: SidebarContext): context is SidebarContext & {
  readonly clientRole: ClientRole;
} {
  return Boolean(context.clientRole);
}

function isOrgRoleAtLeast(
  context: SidebarContext,
  minimumRole: "COLLABORATOR" | "MEMBER" | "MANAGER" | "ORG_ADMIN" | "ORG_OWNER",
) {
  if (!hasOrganizationRole(context)) {
    return false;
  }

  return organizationRoleRank[context.organizationRole] >= organizationRoleRank[minimumRole];
}

function hasItemOrganizationRole(context: SidebarContext, item: SidebarItem) {
  return !item.organizationRoles || Boolean(
    context.organizationRole && item.organizationRoles.includes(context.organizationRole),
  );
}

function hasItemPlatformRole(context: SidebarContext, item: SidebarItem) {
  return !item.platformRoles || Boolean(
    context.platformRole && item.platformRoles.includes(context.platformRole),
  );
}

function hasItemClientRole(context: SidebarContext, item: SidebarItem) {
  return !item.clientRoles || Boolean(
    context.clientRole && item.clientRoles.includes(context.clientRole),
  );
}

function hasCapability(context: SidebarContext, capability: keyof SidebarPlanCapabilities) {
  const value = context.planCapabilities[capability];

  if (typeof value === "number") {
    return value > 0;
  }

  return value;
}

function capabilityDisabledReason(capability: keyof SidebarPlanCapabilities): SidebarDisabledReason {
  return capability === "aiEnabled" ? "AI_DISABLED" : "PLAN_UPGRADE_REQUIRED";
}

function isSessionCompatible(context: SidebarContext, manifest: SidebarManifest) {
  if (manifest.surface === "clientPortal") {
    return context.sessionType === "client" || context.sessionType === "token";
  }

  return context.sessionType === manifest.defaultSessionType;
}

function isCandidateVisible(context: SidebarContext, item: SidebarItem) {
  if (item.visible) {
    return true;
  }

  return Boolean(item.requiresFeatureFlag && context.featureFlags[item.requiresFeatureFlag]);
}

function shouldHideItem(item: SidebarItem, reason?: SidebarDisabledReason) {
  if (!reason) {
    return false;
  }

  if (item.visibilityStrategy === "teaser" || item.visibilityStrategy === "disable") {
    return false;
  }

  return item.visibilityStrategy === "hide" ||
    reason === "ROLE_RESTRICTED" ||
    reason === "SURFACE_MISMATCH";
}

export function canAccessMemberRoute(context: SidebarContext, href = "/dashboard") {
  if (context.sessionType !== "app" || !hasOrganizationRole(context)) {
    return false;
  }

  if (
    href.startsWith("/super-admin") ||
    href.startsWith("/client") ||
    href.startsWith("/share")
  ) {
    return false;
  }

  if (href.startsWith("/team/settings")) {
    return canManageOrgSettings(context);
  }

  if (href.startsWith("/team")) {
    return canReadOrgAggregate(context);
  }

  return isOrgRoleAtLeast(context, "COLLABORATOR");
}

export function canAccessOrgAdmin(context: SidebarContext) {
  return context.sessionType === "app" &&
    context.planCapabilities.orgAdminEnabled &&
    canReadOrgAggregate(context);
}

export function canManageOrgSettings(context: SidebarContext) {
  return context.sessionType === "app" &&
    context.planCapabilities.orgAdminEnabled &&
    (context.organizationRole === "ORG_OWNER" || context.organizationRole === "ORG_ADMIN");
}

export function canReadOrgAggregate(context: SidebarContext) {
  if (context.sessionType !== "app" || !context.planCapabilities.orgAdminEnabled) {
    return false;
  }

  if (context.organizationRole === "ORG_OWNER" || context.organizationRole === "ORG_ADMIN") {
    return true;
  }

  return context.organizationRole === "MANAGER" && context.managedUnitIds.length > 0;
}

export function canManageBilling(context: SidebarContext) {
  return canManageOrgSettings(context) && context.planCapabilities.billingEnabled;
}

export function canUseAiModule(context: SidebarContext) {
  return context.sessionType === "app" &&
    hasOrganizationRole(context) &&
    context.planCapabilities.aiEnabled;
}

export function canUseScopedAssistant(context: SidebarContext) {
  if (context.surface === "platform") {
    return canAccessPlatformTool(context);
  }

  if (context.surface === "clientPortal") {
    return canReadClientPortal(context);
  }

  return canUseAiModule(context);
}

export function canAccessPlatformTool(context: SidebarContext) {
  return context.sessionType === "platform" &&
    context.surface === "platform" &&
    hasPlatformRole(context);
}

export function canReadClientPortal(context: SidebarContext) {
  return (context.sessionType === "client" || context.sessionType === "token") &&
    context.surface === "clientPortal" &&
    hasClientRole(context) &&
    context.planCapabilities.clientPortalEnabled;
}

export function evaluateSidebarPolicy(context: SidebarContext, policy: SidebarPolicyKey) {
  switch (policy) {
    case "canReadMemberHome":
      return canAccessMemberRoute(context);
    case "canUseScopedAssistant":
      return canUseScopedAssistant(context);
    case "canUseAiModule":
      return canUseAiModule(context);
    case "canReadOwnOrAssignedClientWork":
    case "canReadOwnReports":
    case "canReadIssues":
      return canAccessMemberRoute(context);
    case "canReadOrgAggregate":
      return canReadOrgAggregate(context);
    case "canManageOrgSettings":
      return canManageOrgSettings(context);
    case "canManageBilling":
      return canManageBilling(context);
    case "canAccessPlatformTool":
      return canAccessPlatformTool(context);
    case "canReadClientPortal":
      return canReadClientPortal(context);
    default:
      policy satisfies never;
      return false;
  }
}

function resolveSidebarItem(
  context: SidebarContext,
  manifest: SidebarManifest,
  item: SidebarItem,
): ResolvedSidebarItem | null {
  const sourceVisible = isCandidateVisible(context, item);
  const sessionAllowed = context.surface === manifest.surface && isSessionCompatible(context, manifest);
  const roleAllowed = hasItemOrganizationRole(context, item) &&
    hasItemPlatformRole(context, item) &&
    hasItemClientRole(context, item);
  const capabilityAllowed = item.requiresCapability
    ? hasCapability(context, item.requiresCapability)
    : true;
  const featureAllowed = item.requiresFeatureFlag
    ? context.featureFlags[item.requiresFeatureFlag]
    : true;
  const policyAllowed = evaluateSidebarPolicy(context, item.policy);

  if (!sourceVisible) {
    return null;
  }

  const disabledReason = !sessionAllowed
    ? "SURFACE_MISMATCH"
    : !roleAllowed
      ? "ROLE_RESTRICTED"
      : !capabilityAllowed && item.requiresCapability
        ? capabilityDisabledReason(item.requiresCapability)
        : !featureAllowed
          ? "FEATURE_FLAG_OFF"
          : !policyAllowed && context.organizationRole === "MANAGER"
            ? "UNIT_SCOPE_REQUIRED"
            : !policyAllowed
              ? "ROLE_RESTRICTED"
              : undefined;

  if (shouldHideItem(item, disabledReason)) {
    return null;
  }

  return {
    ...item,
    visible: true,
    disabled: Boolean(disabledReason),
    disabledReason,
    resolution: {
      sourceVisible,
      policyAllowed,
      roleAllowed,
      capabilityAllowed,
      featureAllowed,
      sessionAllowed,
    },
  };
}

export function resolveSidebarSections(context: SidebarContext): readonly ResolvedSidebarSection[] {
  const manifest = roleAwareSidebarManifests[context.surface];

  if (!isSessionCompatible(context, manifest)) {
    return [];
  }

  return manifest.sections
    .map((section) => ({
      id: section.id,
      label: section.label,
      priority: section.priority,
      items: section.items
        .map((item) => resolveSidebarItem(context, manifest, item))
        .filter((item): item is ResolvedSidebarItem => Boolean(item)),
    }))
    .filter((section) => section.items.length > 0)
    .sort((first, second) => first.priority - second.priority);
}

export const sidebarContextExamples = {
  member: {
    sessionType: "app",
    surface: "member",
    organizationRole: "MEMBER",
    managedUnitIds: [],
    planCapabilities: {
      aiEnabled: true,
      clientPortalEnabled: false,
      shareBrandingEnabled: false,
      orgAdminEnabled: false,
      billingEnabled: false,
      maxUnits: 0,
    },
    featureFlags: {
      legacySpinNav: false,
      interviewEnabled: true,
      theaterEnabled: true,
      orgAdminBeta: false,
      clientPortalBeta: false,
    },
    isDemo: false,
  },
  orgAdmin: {
    sessionType: "app",
    surface: "orgAdmin",
    organizationRole: "ORG_ADMIN",
    managedUnitIds: [],
    planCapabilities: {
      aiEnabled: true,
      clientPortalEnabled: true,
      shareBrandingEnabled: true,
      orgAdminEnabled: true,
      billingEnabled: true,
      maxUnits: 20,
    },
    featureFlags: {
      legacySpinNav: false,
      interviewEnabled: true,
      theaterEnabled: true,
      orgAdminBeta: true,
      clientPortalBeta: true,
    },
    isDemo: false,
  },
  platform: {
    sessionType: "platform",
    surface: "platform",
    platformRole: "SUPPORT",
    managedUnitIds: [],
    planCapabilities: {
      aiEnabled: false,
      clientPortalEnabled: false,
      shareBrandingEnabled: false,
      orgAdminEnabled: false,
      billingEnabled: false,
      maxUnits: 0,
    },
    featureFlags: {
      legacySpinNav: false,
      interviewEnabled: false,
      theaterEnabled: false,
      orgAdminBeta: false,
      clientPortalBeta: false,
    },
    isDemo: false,
  },
  clientPortal: {
    sessionType: "client",
    surface: "clientPortal",
    clientRole: "CLIENT_MEMBER",
    managedUnitIds: [],
    planCapabilities: {
      aiEnabled: false,
      clientPortalEnabled: true,
      shareBrandingEnabled: true,
      orgAdminEnabled: false,
      billingEnabled: false,
      maxUnits: 0,
    },
    featureFlags: {
      legacySpinNav: false,
      interviewEnabled: false,
      theaterEnabled: false,
      orgAdminBeta: false,
      clientPortalBeta: true,
    },
    isDemo: false,
  },
} as const satisfies Record<SidebarSurface, SidebarContext>;

export const sidebarMigrationNote = {
  sourceFile: "src/components/layout/sidebar.tsx",
  currentSections: ["今日", "AI 工作台", "客戶工作", "團隊與系統"],
  currentRoutes: [
    "/dashboard",
    "/interview",
    "/theater",
    "/crm",
    "/pre-visit",
    "/reports",
    "/team",
    "/team/settings",
    "/settings",
  ],
  currentActions: ["openAssistant"],
  currentActiveState: "pathname exact or prefix match; /team/settings is excluded from /team active state",
  currentAccessibility:
    "collapsed icon-only items use tooltip/aria-label; assistant action has aria-label",
  nextMigration:
    "RAS-002 should introduce resolver/policy filtering before sidebar.tsx consumes these manifests.",
  dirtyWorktreeNote:
    "2026-06-20 observation: sidebar.tsx has an unrelated local /notes entry change; RAS-001 contract intentionally does not stage or overwrite it.",
} as const;
