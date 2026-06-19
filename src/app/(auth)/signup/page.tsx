import { AuthLinkRow, AuthSurfaceShell, SurfaceRuleCard, TextLink } from "../_components/auth-surface";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <AuthSurfaceShell
      eyebrow="Workspace selection"
      title="建立你的誠問 AI 帳號"
      description="Level 3 上線開放帳號密碼註冊，建立 personal workspace；團隊成員仍可透過 invite email 加入既有 organization。"
      surface="app"
      aside={
        <SurfaceRuleCard
          title="上線登入規則"
          items={[
            "帳號密碼註冊會建立 personal workspace。",
            "Google OAuth 會自動建立或連結同 email 的 workspace。",
            "Email 驗證碼可作無密碼登入，但需正式寄信 provider。",
            "團隊邀請需寄出真實 invite email。",
          ]}
        />
      }
    >
      <SignupForm />

      <AuthLinkRow>
        <span>已有帳號？</span>
        <TextLink href="/login">登入</TextLink>
        <span>方案比較請看</span>
        <TextLink href="/pricing">價格方案</TextLink>
      </AuthLinkRow>
    </AuthSurfaceShell>
  );
}
