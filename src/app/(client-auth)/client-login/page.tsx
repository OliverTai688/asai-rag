import {
  AuthLinkRow,
  AuthSurfaceShell,
  SurfaceRuleCard,
  TextLink,
} from "../../(auth)/_components/auth-surface";
import { ClientLoginForm } from "./_components/client-login-form";

export default async function ClientLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const initialToken = params?.token ?? "";

  return (
    <AuthSurfaceShell
      eyebrow="Client session"
      title="客戶報告入口"
      description="客戶登入使用獨立 client session，只能查看被授權的報告、預約、回覆或補資料，不進入內部 CRM。"
      surface="client"
      aside={
        <SurfaceRuleCard
          title="客戶可見性"
          icon="client"
          items={[
            "只能看授權報告與自己的互動資料。",
            "不可看其他客戶、團隊績效或內部 AI prompt。",
            "Token share 仍保留；client login 用於長期入口。",
            "Share branding 可顯示 organization / unit 品牌。",
          ]}
        />
      }
    >
      <ClientLoginForm initialToken={initialToken} />

      <AuthLinkRow>
        <span>收到分享連結？</span>
        <TextLink href="/client-login?token=demo-share-wang">使用分享授權登入</TextLink>
        <span>顧問請走</span>
        <TextLink href="/login">工作台登入</TextLink>
      </AuthLinkRow>
    </AuthSurfaceShell>
  );
}
