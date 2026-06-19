import { demoLoginAccounts, isDemoPasswordLoginEnabled } from "@/lib/demo-login";
import { AuthLinkRow, AuthSurfaceShell, SurfaceRuleCard, TextLink } from "../_components/auth-surface";
import { DemoLoginForm } from "./demo-login-form";

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
      <DemoLoginForm
        accounts={isDemoPasswordLoginEnabled ? demoLoginAccounts : []}
        demoLoginEnabled={isDemoPasswordLoginEnabled}
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
