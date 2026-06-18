import {
  AuthFormCard,
  AuthSurfaceShell,
  SurfaceRuleCard,
} from "../../../(auth)/_components/auth-surface";

export default function SuperAdminLoginPage() {
  return (
    <AuthSurfaceShell
      eyebrow="Platform session"
      title="平台管理員登入"
      description="Super admin 使用獨立 platform session，不與一般 app session 混用。此入口只服務誠問 AI 內部營運、客服、財務與系統管理者。"
      surface="platform"
      aside={
        <SurfaceRuleCard
          title="平台安全規則"
          icon="platform"
          items={[
            "Platform session 與 app/client session 分離。",
            "查看敏感資料需 break-glass reason。",
            "Impersonation 必須具 reason、scope、expiry 與 audit log。",
            "Support 不可無痕或永久接管帳號。",
          ]}
        />
      }
    >
      <AuthFormCard
        title="Super admin"
        description="正式版本會要求平台角色、MFA 與更嚴格的稽核。"
        fields={[
          { id: "email", label: "平台 Email", type: "email", placeholder: "operator@sincere-ai.internal" },
          { id: "password", label: "密碼", type: "password", placeholder: "輸入平台密碼" },
          { id: "mfa", label: "MFA", placeholder: "6 位數驗證碼" },
        ]}
        primaryLabel="登入平台後台"
        helper="此入口不建立一般 app session；platform role 不應從 /login 進入。"
      />
    </AuthSurfaceShell>
  );
}
