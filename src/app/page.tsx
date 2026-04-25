import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield, UserCheck, MessageSquare } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans tracking-tight">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
            誠問 AI
          </span>
        </div>
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", className: "font-medium" })}>
          直接進入主控台
        </Link>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-6 pt-24 pb-20 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>全新一代保險業務 AI 助手</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-[1.1] text-zinc-900 dark:text-white">
            讓保險回歸 <span className="text-indigo-600">真誠</span> 的對話
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            運用 SPIN 銷售法結合智能分析，協助您深入了解客戶需求，
            並自動生成專業報告。從此告別生硬推銷，讓每一次交流都充滿價值。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className={buttonVariants({ size: "lg", className: "h-14 px-8 text-lg rounded-full shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 transition-all hover:scale-105" })}
            >
              立即開始流程 <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-zinc-200 dark:border-zinc-800">
              瞭解更多
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-6 py-20 bg-white dark:bg-zinc-900 border-y border-zinc-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                <MessageSquare className="text-orange-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">SPIN 智能導引</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                AI 會話模組根據 SPIN 提問技巧設計，協助您逐步挖掘客戶核心痛點。
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Shield className="text-blue-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">保障缺口分析</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                自動整合客戶現有保單，視覺化呈現風險缺口，讓建議書更有說服力。
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <UserCheck className="text-green-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">360° 客戶檢視</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                完整記錄每一次互動、演練與報告生成，隨時掌握客戶動態。
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-12 text-center text-zinc-500 text-sm border-t border-zinc-200 dark:border-zinc-800">
        © 2026 Sincere Question AI. All rights reserved.
      </footer>
    </div>
  );
}
