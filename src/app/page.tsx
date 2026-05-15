import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Sparkles, UserCheck, MessageSquare, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F7FAFF] font-sans tracking-tight">
      {/* Header */}
      <header
        className="px-6 py-0 flex items-center justify-between bg-white/95 sticky top-0 z-50 h-16"
        style={{ borderBottom: "1px solid #CFD8DC", boxShadow: "0 1px 0 0 #CFD8DC" }}
      >
        {/* Gold accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ background: "linear-gradient(90deg,#B8860B 0%,#D4A017 40%,#C9A227 60%,#B8860B 100%)", opacity: 0.5 }}
        />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1A3A6B] flex items-center justify-center shadow-sm">
            <Sparkles className="text-[#C9A227] w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[16px] font-bold text-[#0A2342] tracking-tight">誠問 AI</span>
            <span className="hidden sm:inline text-[11px] text-[#546E7A] ml-2 font-medium">
              Sincere Question AI
            </span>
          </div>
        </div>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline", size: "sm", className: "font-medium text-[#1565C0] border-[#1565C0]/30 hover:bg-[#EBF3FB]" })}
        >
          直接進入主控台
        </Link>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-6 pt-24 pb-20 text-center max-w-4xl mx-auto overflow-hidden">
          {/* Decorative radial background — very subtle */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(21,101,192,0.07) 0%, transparent 70%)",
            }}
          />
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EBF3FB] text-[#1565C0] text-[12px] font-semibold mb-8 border border-[#90CAF9]/30">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" strokeWidth={1.5} />
            <span>深度理解保險銷售的智能助手</span>
          </div>

          <h1 className="text-5xl md:text-[64px] font-bold mb-6 leading-[1.1] text-[#0A2342] tracking-tight">
            讓保險回歸{" "}
            <span className="text-[#1565C0]">真誠</span>{" "}
            的對話
          </h1>

          <p className="text-[17px] text-[#546E7A] mb-3 max-w-lg mx-auto leading-relaxed font-medium italic">
            如深海浮月，以誠意為底色，以智慧為光澤
          </p>
          <p className="text-[15px] text-[#546E7A] mb-10 max-w-2xl mx-auto leading-relaxed">
            運用 SPIN 銷售法結合智能分析，協助您深入了解客戶需求，
            並自動生成專業報告。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className={buttonVariants({
                size: "lg",
                variant: "gold",
                className: "h-12 px-8 text-[15px] rounded-xl shadow-lg shadow-[#C9A227]/20 font-semibold"
              })}
            >
              立即開始體驗 <ArrowRight className="ml-2 w-4 h-4" strokeWidth={2} />
            </Link>
            <Link
              href="/dashboard"
              className={buttonVariants({
                size: "lg",
                variant: "outline",
                className: "h-12 px-8 text-[15px] rounded-xl text-[#1565C0] border-[#1565C0]/30 hover:bg-[#EBF3FB]"
              })}
            >
              體驗 14 天，感受不同
            </Link>
          </div>
        </section>

        {/* Features Grid */}

        <section className="px-6 py-20 bg-white border-y border-[#CFD8DC]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-[11px] font-semibold text-[#C9A227] uppercase tracking-[0.15em] mb-3">核心功能</p>
              <h2 className="text-[28px] font-bold text-[#0A2342]">一次對話，一份準備</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard
                icon={MessageSquare}
                title="SPIN 智能導引"
                description="AI 會話模組根據 SPIN 提問技巧設計，協助您逐步挖掘客戶核心痛點，讓每一次對話都更有深度。"
                accentColor="#1565C0"
                bgColor="#EBF3FB"
              />
              <FeatureCard
                icon={UserCheck}
                title="360° 客戶檢視"
                description="完整記錄每一次互動、演練與報告生成，隨時掌握客戶動態，不錯過任何商機。"
                accentColor="#0A2342"
                bgColor="#D6E8F8"
              />
              <FeatureCard
                icon={Shield}
                title="專業報告生成"
                description="一鍵產出符合保險業規範的客戶建議書，以誠意為基礎呈現最適合的保障方案。"
                accentColor="#B8860B"
                bgColor="#FDF3D0"
              />
            </div>
          </div>
        </section>

        {/* Brand statement */}
        <section className="px-6 py-16 text-center max-w-2xl mx-auto">
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-[#C9A227] mx-auto mb-8 opacity-60" />
          <blockquote className="text-[18px] text-[#0A2342] font-medium leading-relaxed">
            「資深顧問對客戶說中文 — 沉穩、有份量、值得信賴。」
          </blockquote>
          <p className="text-[13px] text-[#546E7A] mt-4 font-medium tracking-wider uppercase">
            誠問 AI · 品牌核心理念
          </p>
        </section>
      </main>

      <footer className="px-6 py-8 border-t border-[#CFD8DC] bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#1A3A6B] flex items-center justify-center">
              <Sparkles className="text-[#C9A227] w-3 h-3" strokeWidth={1.5} />
            </div>
            <span className="text-[13px] font-semibold text-[#0A2342]">誠問 AI</span>
          </div>
          <p className="text-[12px] text-[#546E7A]">
            © 2026 誠問 AI · Sincere Question AI · All Rights Reserved
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  accentColor,
  bgColor,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  accentColor: string;
  bgColor: string;
}) {
  return (
    <div className="space-y-4 p-6 rounded-xl bg-[#F7FAFF] border border-[#CFD8DC] hover:border-[#90CAF9] hover:shadow-md transition-all duration-200">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: bgColor }}
      >
        <Icon className="w-5 h-5" style={{ color: accentColor }} strokeWidth={1.5} />
      </div>
      <h3 className="text-[16px] font-bold text-[#0A2342]">{title}</h3>
      <p className="text-[14px] text-[#546E7A] leading-relaxed">{description}</p>
    </div>
  );
}
