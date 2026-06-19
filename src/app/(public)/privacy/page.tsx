import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const metadata = {
  title: "隱私權政策 | 誠問 AI",
  description: "誠問 AI private beta 的隱私、資料使用與 AI 輔助揭露政策。",
};

const sections = [
  {
    title: "我們收集的資料",
    body: [
      "帳號與工作區資料：姓名、角色、組織、通訊處、登入與授權狀態。",
      "顧問工作資料：客戶基本資料、保單、家庭關係、訪談筆記、報告、任務與團隊管理資訊。",
      "AI 使用資料：功能模組、token 用量、成本估算、錯誤狀態與必要的 audit metadata。",
    ],
  },
  {
    title: "資料如何使用",
    body: [
      "用於提供 CRM、訪前規劃、AI 顧問陪談、劇場演練、報告與 client portal 體驗。",
      "用於租戶隔離、權限控管、成本追蹤、除錯、資安稽核與合規留痕。",
      "正式公開上線前，production email、notification、payment 仍需明確核可才會啟用。",
    ],
  },
  {
    title: "資料保護與存取",
    body: [
      "所有業務資料以 organizationId 做租戶切分；manager 與 platform 預設只看彙總，不看 member 私人客戶明細。",
      "Support 或 super admin 若需敏感讀取，必須透過 reason、scope、expiry 與 audit log 的 break-glass / impersonation 機制。",
      "我們不會在 report、QA evidence 或公開頁面保存 raw cookie、secret、token 或私人 payload。",
    ],
  },
  {
    title: "AI 使用與責任邊界",
    body: [
      "誠問 AI 產出的建議、摘要、訪談問題與報告草稿屬於輔助資訊，不構成保險、投資、法律或稅務建議。",
      "顧問與組織仍需自行確認事實、法規、商品適合度、KYC/PQ、揭露義務與客戶同意。",
      "AI 可能產生錯誤、遺漏或不完整推論；高敏感客戶資料與正式文件應經人工審閱後才可使用。",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-hairline pb-5">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A3A6B] text-sm font-bold text-white">
              誠
            </span>
            <span className="text-sm font-semibold text-ink">誠問 AI</span>
          </Link>
          <Link href="/terms" className={buttonVariants({ variant: "monoOutline", size: "sm" })}>
            服務條款
          </Link>
        </header>

        <section className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Private beta policy
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">隱私權政策</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            本頁是誠問 AI private beta 的最小隱私揭露版本，用於 release readiness 與受控測試。正式公開上線前，仍需由營運、法務與合規負責人完成審閱與核可。
          </p>
        </section>

        <section className="grid gap-4">
          {sections.map((section) => (
            <article key={section.title} className="rounded-lg border border-hairline bg-card p-5">
              <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                {section.body.map((item) => (
                  <li key={item} className="border-l border-hairline pl-3">
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <footer className="border-t border-hairline pt-5 text-xs leading-5 text-muted-foreground">
          更新日期：2026-06-19。若需要刪除、匯出、修正資料，請由組織管理員或指定 operator 提交 support request；正式客服通道仍待 production approval。
        </footer>
      </div>
    </main>
  );
}
