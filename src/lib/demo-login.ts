import "server-only";

export type DemoLoginAccount = {
  email: string;
  label: string;
  password: string;
  role: "member" | "manager" | "collaborator";
};

export const isDemoPasswordLoginEnabled =
  process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_AUTH_HEADER === "true";

export const demoLoginAccounts: DemoLoginAccount[] = [
  {
    email: "demo.member@asai.local",
    label: "業務員體驗",
    password: "AsaiDemo-Member-2026!",
    role: "member",
  },
  {
    email: "demo.manager@asai.local",
    label: "主管體驗",
    password: "AsaiDemo-Manager-2026!",
    role: "manager",
  },
  {
    email: "demo.collaborator@asai.local",
    label: "協作者體驗",
    password: "AsaiDemo-Collab-2026!",
    role: "collaborator",
  },
];

const demoPasswordByEmail = new Map(
  demoLoginAccounts.map((account) => [account.email, account.password])
);

export function validateDemoLoginPassword(email: string, password: string) {
  return demoPasswordByEmail.get(email.toLowerCase()) === password;
}
