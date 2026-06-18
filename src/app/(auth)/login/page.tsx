import {
  AuthFormCard,
  AuthLinkRow,
  AuthSurfaceShell,
  SurfaceRuleCard,
  TextLink,
} from "../_components/auth-surface";

export default function LoginPage() {
  return (
    <AuthSurfaceShell
      eyebrow="App session"
      title="回到你的工作台"
      description="一般登入入口只服務 member 與 org admin。登入後依預設 workspace 與角色分流到個人工作台或通訊處管理台。"
      surface="app"
      aside={
        <SurfaceRuleCard
          title="登入後分流"
          items={[
            "MEMBER / COLLABORATOR 進入 member admin。",
            "ORG_OWNER / ORG_ADMIN / MANAGER 可進入 org admin。",
            "Client user 請走客戶入口，不使用此 session。",
            "Platform role 請走 super admin 獨立入口。",
          ]}
        />
      }
    >
      <AuthFormCard
        title="登入誠問 AI"
        description="此頁是 auth provider 接入前的 route skeleton；正式版本會接 Supabase Auth 或同等 provider。"
        fields={[
          { id: "email", label: "Email", type: "email", placeholder: "advisor@example.com" },
          { id: "password", label: "密碼", type: "password", placeholder: "輸入密碼" },
        ]}
        primaryLabel="登入工作台"
        helper="PSA-002 僅建立 surface 與 redirect 邊界，不建立假 session。"
      />

      <AuthLinkRow>
        <span>還沒有帳號？</span>
        <TextLink href="/signup">建立帳號</TextLink>
        <span>客戶入口請至</span>
        <TextLink href="/client-login">客戶登入</TextLink>
      </AuthLinkRow>
    </AuthSurfaceShell>
  );
}
