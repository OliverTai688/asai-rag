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
      title="申請加入誠問 AI beta"
      description="Private beta 採 invite-only。留下資料後進入等待名單；正式帳號建立必須透過受控邀請 token，不開放 public self-serve workspace。"
      surface="app"
      aside={
        <SurfaceRuleCard
          title="Beta 加入規則"
          items={[
            "未受邀使用者只能進入等待名單，不會自動建立 production workspace。",
            "受邀使用者需走 /invite/[token]，由 server 建立或連結 membership。",
            "可選載入 DB demo seed，不再使用本地 mockdata。",
            "付款、正式 email 與 production notification 在 beta 仍預設關閉。",
          ]}
        />
      }
    >
      <AuthFormCard
        title="加入等待名單"
        description="此表單目前只作 beta access request；不會建立 User、Organization、Membership 或 workspace。"
        fields={[
          { id: "name", label: "姓名", placeholder: "王小明" },
          { id: "email", label: "Email", type: "email", placeholder: "advisor@example.com" },
          { id: "workspace", label: "預計使用型態", placeholder: "personal / team / enterprise" },
        ]}
        primaryLabel="送出 beta access request"
        helper="目前不開 public signup；operator 核准後會以人工方式提供 invite token。"
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
