import {
  AuthFormCard,
  AuthLinkRow,
  AuthSurfaceShell,
  SurfaceRuleCard,
  TextLink,
} from "../../_components/auth-surface";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shortToken = token.slice(0, 8);

  return (
    <AuthSurfaceShell
      eyebrow="Invitation token"
      title="接受團隊邀請"
      description="受邀成員不需要看 pricing 決策。驗證邀請 token 後，系統會把使用者加入既有 organization 並依角色導向 member 或 org admin。"
      surface="app"
      aside={
        <SurfaceRuleCard
          title="邀請分流"
          items={[
            "Token 只能加入指定 organization。",
            "MEMBER / COLLABORATOR 接受後進入 member admin。",
            "MANAGER 接受後可進入 org admin，但只看彙總與輔導指標。",
            "邀請不建立 platform session，也不授權 super admin。",
          ]}
        />
      }
    >
      <AuthFormCard
        title={`邀請碼 ${shortToken}`}
        description="正式版本會先驗證 token 狀態、到期時間、organization 與席次限制。"
        fields={[
          { id: "email", label: "受邀 Email", type: "email", placeholder: "member@example.com" },
          { id: "name", label: "顯示名稱", placeholder: "受邀成員姓名" },
        ]}
        primaryLabel="接受邀請"
        helper="若 organization 已達席次或 personal collaborator 上限，server-side 必須拒絕。"
      />

      <AuthLinkRow>
        <span>已經加入過？</span>
        <TextLink href="/login">登入工作台</TextLink>
      </AuthLinkRow>
    </AuthSurfaceShell>
  );
}
