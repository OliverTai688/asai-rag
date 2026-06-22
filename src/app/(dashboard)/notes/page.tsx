import Link from "next/link";
import { ArrowRight, FileText, NotebookPen, ShieldCheck } from "lucide-react";

export default function NotesPage() {
  return (
    <main
      data-testid="notes-hub-quarantine"
      data-local-note-store="disabled"
      data-accepted-notes-source="/pre-visit/[planId]/notes"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8"
    >
      <header className="grid gap-6 border-b border-hairline pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            AI Meeting Notes
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
            會議筆記入口
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            從已建立的準備包進入拜訪後筆記與 AI 會議工作台，讓摘要、佐證、待確認事項與寫回確認都留在同一條客戶脈絡。
          </p>
        </div>

        <Link
          data-testid="notes-hub-primary-action"
          href="/pre-visit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-sm font-medium text-paper transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ink/25"
        >
          選擇準備包
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <section
        aria-label="正式筆記路徑"
        data-testid="notes-hub-safe-paths"
        className="grid gap-3 md:grid-cols-2"
      >
        <article className="rounded-lg border border-hairline bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper">
              <FileText className="size-4 text-[#1A3A6B]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink">拜訪後筆記</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                由準備包進入 `/pre-visit/[planId]/notes`，沿用 owner-scoped visit BFF、postVisitNotes 相容層與 Route B 紅線提醒。
              </p>
              <Link
                href="/pre-visit"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline"
              >
                找準備包
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-hairline bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper">
              <NotebookPen className="size-4 text-[#1A3A6B]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink">AI 會議工作台</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                從準備包或 CRM 客戶頁開啟 CLIENT_MEETING workspace，保留摘要引用、記憶問答與人工確認後寫回。
              </p>
              <Link
                href="/pre-visit"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline"
              >
                進入工作台
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </article>
      </section>

      <section
        aria-label="筆記資料邊界"
        data-testid="notes-hub-source-boundary"
        className="rounded-lg border border-hairline bg-paper-2 p-5"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper">
            <ShieldCheck className="size-4 text-[#1A3A6B]" aria-hidden="true" />
          </span>
          <div className="grid flex-1 gap-3 md:grid-cols-3">
            <BoundaryItem title="資料來源" body="只銜接已驗收的 visit / meeting BFF；不在此建立未歸戶草稿。" />
            <BoundaryItem title="隱私邊界" body="不保存 raw audio、raw transcript、provider payload 或正式法遵 finding。" />
            <BoundaryItem title="下一步" body="快速筆記需另建 server-owned BFF 與 writeback boundary 後再開放。" />
          </div>
        </div>
      </section>
    </main>
  );
}

function BoundaryItem({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink">{body}</p>
    </div>
  );
}
