import {
  AuthFormCard,
  AuthLinkRow,
  AuthSurfaceShell,
  SurfaceRuleCard,
  TextLink,
} from "../_components/auth-surface";

export default function SignupPage() {
  return (
    <AuthSurfaceShell
      eyebrow="Workspace selection"
      title="建立你的誠問 AI 帳號"
      description="註冊時先選 personal 或 team/enterprise。兩者都會建立 organization，讓資料、方案、AI quota 與未來升級保持同一套模型。"
      surface="app"
      aside={
        <SurfaceRuleCard
          title="註冊規則"
          items={[
            "Personal 建立 personal organization，owner 為註冊者。",
            "Team / Enterprise 建立 business organization，owner 進入 org onboarding。",
            "可選載入 DB demo seed，不再使用本地 mockdata。",
            "付款第一版走綠界，billing model 保持 provider-neutral。",
          ]}
        />
      }
    >
      <AuthFormCard
        title="選擇帳號型態"
        description="正式版本會在送出後建立 User、Organization、Membership 與 plan/trial 狀態。"
        fields={[
          { id: "name", label: "姓名", placeholder: "王小明" },
          { id: "email", label: "Email", type: "email", placeholder: "advisor@example.com" },
          { id: "workspace", label: "帳號型態", placeholder: "personal / team / enterprise" },
        ]}
        primaryLabel="建立帳號"
        helper="Personal 也使用 organization model；協作者上限由 super admin 的 PlanConfig 控制。"
      />

      <AuthLinkRow>
        <span>已有帳號？</span>
        <TextLink href="/login">登入</TextLink>
        <span>方案比較請看</span>
        <TextLink href="/pricing">價格方案</TextLink>
      </AuthLinkRow>
    </AuthSurfaceShell>
  );
}
