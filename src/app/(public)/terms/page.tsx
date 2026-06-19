import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const metadata = {
  title: "服務條款 | 誠問 AI",
  description: "誠問 AI private beta 的服務條款、AI 免責與上線限制。",
};

const terms = [
  {
    title: "Beta 服務範圍",
    body: "誠問 AI 目前用於受控 private beta，功能涵蓋 CRM、AI 顧問陪談、劇場演練、訪前規劃、報告與 client portal。未經 production approval，不應用於正式對外承諾、收費或不可回復的業務流程。",
  },
  {
    title: "帳號與權限",
    body: "使用者需透過授權帳號與對應角色使用服務。組織管理員負責管理成員、通訊處、協作者與客戶存取；platform support/super admin 僅能在 audit-bound 的 reason、scope、expiry 下進行支援操作。",
  },
  {
    title: "AI 使用與專業判斷",
    body: "AI 內容僅供輔助，可能不完整或不準確。保險商品適合度、KYC/PQ、法遵揭露、核保限制、稅務與法律判斷，仍由顧問、組織與其授權審閱者負責。",
  },
  {
    title: "資料與合規",
    body: "使用者不得輸入不必要的高度敏感資料、第三方未授權資料或違反組織政策的內容。系統會保存必要 audit、AI usage、錯誤與權限 metadata 以支援安全、除錯與合規追蹤。",
  },
  {
    title: "付款與正式啟用",
    body: "ECPay checkout、正式通知、正式 email、production client portal 與公開收費功能，預設關閉；需完成測試 checklist、callback/query proof、CheckMacValue 驗證與 production approval 後才可啟用。",
  },
];

export default function TermsPage() {
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
          <Link href="/privacy" className={buttonVariants({ variant: "monoOutline", size: "sm" })}>
            隱私權政策
          </Link>
        </header>

        <section className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Private beta terms
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">服務條款</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            本頁是誠問 AI private beta 的最小條款與 AI 免責版本。正式公開上線前，仍需由營運、法務、合規與付款流程負責人完成審閱與核可。
          </p>
        </section>

        <section className="grid gap-4">
          {terms.map((term, index) => (
            <article key={term.title} className="grid gap-4 rounded-lg border border-hairline bg-card p-5 md:grid-cols-[72px_minmax(0,1fr)]">
              <p className="font-mono text-sm text-muted-foreground">{String(index + 1).padStart(2, "0")}</p>
              <div>
                <h2 className="text-lg font-semibold text-ink">{term.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{term.body}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-lg border border-hairline bg-muted/20 p-5">
          <h2 className="text-base font-semibold text-ink">AI disclaimer</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            誠問 AI 不取代持牌顧問、法務、稅務或合規審閱。所有由 AI 產生的提問、摘要、異議處理、報告草稿與劇場回饋，都必須經人工確認後才能對客戶使用。
          </p>
        </section>

        <footer className="border-t border-hairline pt-5 text-xs leading-5 text-muted-foreground">
          更新日期：2026-06-19。若本頁與正式合約、委任書、保險商品文件或主管機關規範不同，應以正式文件與法規為準。
        </footer>
      </div>
    </main>
  );
}
