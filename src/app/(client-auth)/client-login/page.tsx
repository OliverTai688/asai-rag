import {
  AuthFormCard,
  AuthLinkRow,
  AuthSurfaceShell,
  SurfaceRuleCard,
  TextLink,
} from "../../(auth)/_components/auth-surface";

export default function ClientLoginPage() {
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
      <AuthFormCard
        title="登入客戶頁"
        description="正式版本會用 client role 與授權關係查詢可見報告。"
        fields={[
          { id: "email", label: "Email", type: "email", placeholder: "client@example.com" },
          { id: "code", label: "驗證碼", placeholder: "輸入一次性驗證碼" },
        ]}
        primaryLabel="進入客戶頁"
        helper="Client session 與 member app session 分離，不能互相升級權限。"
      />

      <AuthLinkRow>
        <span>收到分享連結？</span>
        <TextLink href="/share/demo-share-wang">使用分享連結查看</TextLink>
        <span>顧問請走</span>
        <TextLink href="/login">工作台登入</TextLink>
      </AuthLinkRow>
    </AuthSurfaceShell>
  );
}
