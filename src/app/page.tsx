import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getPublicStatus } from "@/lib/public/status-repository";
import {
  ArrowRight,
  Sparkles,
  UserCheck,
  MessageSquare,
  Shield,
  Check,
  TrendingUp,
} from "lucide-react";

export default async function Home() {
  const status = await getPublicStatus();

  return (
    <div className="flex flex-col min-h-screen bg-paper font-sans">
      {/* Header */}
      <header className="px-6 flex items-center justify-between bg-paper/80 backdrop-blur-md sticky top-0 z-50 h-16 border-b border-hairline">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1A3A6B] flex items-center justify-center">
            <Sparkles className="text-[#C9A227] w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[16px] font-semibold text-ink tracking-tight">誠問 AI</span>
            <span className="hidden sm:inline text-[11px] text-ink-3 ml-2 font-medium">
              Sincere Question AI
            </span>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/signup"
            className={buttonVariants({ variant: "mono", size: "sm", className: "rounded-full font-medium" })}
          >
            開始使用
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 pt-24 pb-16">
          {/* layered backdrop */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 glow-hero" />
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid mask-radial opacity-70" />

          <div className="max-w-4xl mx-auto text-center animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-hairline bg-surface/70 backdrop-blur text-[12px] font-medium text-ink-2 mb-8">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#1A3A6B] opacity-60 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1A3A6B]" />
              </span>
              深度理解保險銷售的智能助手
            </div>

            <h1 className="text-display text-ink mb-7">
              讓保險回歸<span className="text-primary">真誠</span>的對話
            </h1>

            <p className="text-[18px] text-ink-2 mb-9 max-w-xl mx-auto leading-relaxed">
              運用 SPIN 銷售法結合智能分析，深入了解客戶需求，並自動生成專業建議書。
              <span className="block mt-1 text-ink-3 text-[15px] italic">如深海浮月，以誠意為底色，以智慧為光澤。</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
              <Link
                href="/signup"
                className={buttonVariants({ size: "lg", variant: "mono", className: "h-12 px-8 text-[15px] rounded-full font-medium" })}
              >
                開始使用 <ArrowRight className="ml-1.5 w-4 h-4" strokeWidth={2} />
              </Link>
              <Link
                href="/pricing"
                className={buttonVariants({ size: "lg", variant: "monoOutline", className: "h-12 px-8 text-[15px] rounded-full" })}
              >
                查看方案
              </Link>
            </div>
            <p className="text-[12px] text-ink-3 flex items-center justify-center gap-4">
              <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5 text-[#1A3A6B]" strokeWidth={2} /> 免綁信用卡</span>
              <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5 text-[#1A3A6B]" strokeWidth={2} /> 符合保險法規</span>
            </p>
          </div>

          {/* Product mockup */}
          <div className="max-w-5xl mx-auto mt-16 animate-fade-up">
            <ProductMock />
          </div>
        </section>

        {/* Stats strip */}
        <section className="px-6 py-10 border-y border-hairline bg-surface/40">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-y-8">
            {[
              { n: "10,000+", l: "AI 對話分析" },
              { n: "92%", l: "客戶痛點命中率" },
              { n: "3 分鐘", l: "生成專業建議書" },
              { n: "4 種", l: "客戶人格演練" },
            ].map((s) => (
              <div key={s.l} className="text-center md:border-l md:border-hairline first:border-0">
                <p className="tabular text-[28px] font-semibold text-ink tracking-tight">{s.n}</p>
                <p className="text-[13px] text-ink-3 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features — bento with inner visuals */}
        <section className="px-6 py-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-eyebrow mb-3">核心功能</p>
              <h2 className="text-h2 text-ink">一次對話，一份準備</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-6 md:auto-rows-[1fr]">
              <FeatureCard
                className="md:col-span-4"
                icon={MessageSquare}
                title="SPIN 智能導引"
                description="AI 依 SPIN 提問技巧設計，逐步挖掘客戶核心痛點，讓每一次對話都更有深度。"
                visual={<ChatVisual />}
              />
              <FeatureCard
                className="md:col-span-2"
                icon={UserCheck}
                title="360° 客戶檢視"
                description="完整記錄每一次互動與演練，隨時掌握客戶動態。"
                visual={<AvatarsVisual />}
              />
              <FeatureCard
                className="md:col-span-3"
                icon={Shield}
                title="專業報告生成"
                description="一鍵產出符合保險規範的客戶建議書。"
                visual={<ReportVisual />}
              />
              <FeatureCard
                className="md:col-span-3"
                icon={TrendingUp}
                title="演練即時評分"
                description="四種客戶人格演練，當場給出表現評分與改進建議。"
                visual={<ScoreVisual />}
              />
            </div>
          </div>
        </section>

        {/* Inverted focus CTA */}
        <section className="section-inverted relative overflow-hidden px-6 py-28">
          <div aria-hidden className="pointer-events-none absolute inset-0 glow-inverted opacity-90" />
          <div className="relative max-w-2xl mx-auto text-center">
            <div className="w-px h-10 bg-[#C9A227]/70 mx-auto mb-8" />
            <blockquote className="text-h2 leading-snug mb-4">
              「資深顧問對客戶說中文 —<br className="hidden sm:block" /> 沉穩、有份量、值得信賴。」
            </blockquote>
            <p className="text-eyebrow mb-10">誠問 AI · 品牌核心理念</p>
            <Link
              href={status.primaryCta.href}
              className={buttonVariants({
                size: "lg",
                variant: "mono",
                className: "h-12 px-8 text-[15px] rounded-full bg-[var(--inverted-fg)] text-[var(--inverted-bg)] hover:opacity-90",
              })}
              data-public-cta
              data-public-cta-mode={status.primaryCta.mode}
              data-checkout-status={status.checkoutAvailability.status}
            >
              {status.primaryCta.label} <ArrowRight className="ml-1.5 w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="px-6 py-8 border-t border-hairline bg-paper">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#1A3A6B] flex items-center justify-center">
              <Sparkles className="text-[#C9A227] w-3 h-3" strokeWidth={1.5} />
            </div>
            <span className="text-[13px] font-semibold text-ink">誠問 AI</span>
          </div>
          <p className="text-[12px] text-ink-3">
            © 2026 誠問 AI · Sincere Question AI · All Rights Reserved
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ─────────── Hero product mockup (CSS-only faux dashboard) ─────────── */
function ProductMock() {
  return (
    <div className="rounded-2xl border border-hairline bg-card shadow-float overflow-hidden">
      {/* browser chrome */}
      <div className="flex items-center gap-2 px-4 h-10 border-b border-hairline bg-paper-2/60">
        <span className="w-3 h-3 rounded-full bg-hairline-2" />
        <span className="w-3 h-3 rounded-full bg-hairline-2" />
        <span className="w-3 h-3 rounded-full bg-hairline-2" />
        <div className="mx-auto flex items-center gap-1.5 text-[11px] text-ink-3 px-3 py-1 rounded-md bg-surface border border-hairline">
          <span className="w-3 h-3 rounded bg-[#1A3A6B]/15" /> app.誠問ai.com / dashboard
        </div>
      </div>
      <div className="flex h-[340px]">
        {/* faux sidebar */}
        <div className="hidden sm:flex w-44 shrink-0 flex-col gap-1 border-r border-hairline p-3 bg-paper-2/30">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-paper-2 text-ink text-[12px] font-semibold">
            <span className="w-3.5 h-3.5 rounded bg-[#1A3A6B]" /> 總覽
          </div>
          {["客戶管理", "SPIN 對話", "劇場演練", "分析報告"].map((t) => (
            <div key={t} className="flex items-center gap-2 px-2 py-2 rounded-lg text-ink-3 text-[12px]">
              <span className="w-3.5 h-3.5 rounded bg-hairline-2" /> {t}
            </div>
          ))}
        </div>
        {/* content */}
        <div className="flex-1 p-4 grid grid-cols-2 gap-3 content-start">
          <div className="col-span-2 flex items-center justify-between">
            <div>
              <div className="h-2.5 w-28 rounded bg-ink/80" />
              <div className="h-2 w-20 rounded bg-hairline-2 mt-2" />
            </div>
            <div className="h-7 w-24 rounded-full bg-ink" />
          </div>
          {/* two stat cards */}
          {[["92%", "命中率"], ["3 分鐘", "生成時間"]].map(([n, l]) => (
            <div key={l} className="rounded-xl border border-hairline p-3 bg-surface">
              <div className="tabular text-[18px] font-semibold text-ink">{n}</div>
              <div className="text-[11px] text-ink-3">{l}</div>
            </div>
          ))}
          {/* mini bar chart */}
          <div className="col-span-2 rounded-xl border border-hairline p-3 bg-surface">
            <div className="h-2 w-16 rounded bg-hairline-2 mb-3" />
            <div className="flex items-end gap-2 h-20">
              {[40, 65, 50, 80, 60, 95, 72].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-[#1A3A6B]" style={{ height: `${h}%`, opacity: 0.35 + i * 0.09 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Bento inner visuals ─────────── */
function ChatVisual() {
  return (
    <div className="space-y-2 rounded-xl border border-hairline bg-paper-2/40 p-3">
      <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-[#1A3A6B] text-white text-[11px] px-3 py-1.5">
        您目前的保障，最擔心的是哪一塊？
      </div>
      <div className="w-fit max-w-[80%] rounded-2xl rounded-bl-sm bg-surface border border-hairline text-ink-2 text-[11px] px-3 py-1.5">
        其實…孩子的教育金我一直沒準備。
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-ink-3 pl-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#1A3A6B] animate-pulse" /> AI 正在分析痛點…
      </div>
    </div>
  );
}

function AvatarsVisual() {
  return (
    <div className="flex -space-x-2">
      {["#1A3A6B", "#2196F3", "#C9A227", "#546E7A"].map((c, i) => (
        <div key={i} className="w-8 h-8 rounded-full border-2 border-card flex items-center justify-center text-paper text-[10px] font-semibold" style={{ background: c }}>
          {["陳", "林", "王", "+"][i]}
        </div>
      ))}
    </div>
  );
}

function ReportVisual() {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-3 space-y-1.5">
      <div className="h-2 w-20 rounded bg-ink/70" />
      <div className="h-1.5 w-full rounded bg-hairline-2" />
      <div className="h-1.5 w-[85%] rounded bg-hairline-2" />
      <div className="h-1.5 w-[60%] rounded bg-hairline-2" />
      <div className="inline-flex items-center gap-1 text-[10px] text-[#1A3A6B] font-medium pt-1">
        <Check className="w-3 h-3" strokeWidth={2.5} /> 符合 KYC 規範
      </div>
    </div>
  );
}

function ScoreVisual() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-3">
      <div className="tabular text-[26px] font-semibold text-ink leading-none">87</div>
      <div className="flex-1 space-y-1">
        {[80, 92, 70].map((w, i) => (
          <div key={i} className="h-1.5 rounded-full bg-paper-2 overflow-hidden">
            <div className="h-full rounded-full bg-[#1A3A6B]" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  visual,
  className,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  visual?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-4 p-6 rounded-2xl bg-card border border-hairline transition-[border-color,transform] duration-200 hover:border-hairline-2 hover:-translate-y-0.5 ${className ?? ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-paper-2 shrink-0">
          <Icon className="w-[18px] h-[18px] text-[#1A3A6B]" strokeWidth={1.5} />
        </div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      </div>
      <p className="text-[13px] text-ink-3 leading-relaxed">{description}</p>
      {visual && <div className="mt-auto pt-1">{visual}</div>}
    </div>
  );
}
