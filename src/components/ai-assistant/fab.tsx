"use client";

import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AssistantFAB() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Tooltip>
        <TooltipTrigger>
          <button
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 animate-voice-pulse group"
            style={{
              background: "linear-gradient(135deg, #B8860B 0%, #D4A017 50%, #C9A227 100%)",
              boxShadow: "0 8px 24px rgba(201,162,39,0.35)",
            }}
          >
            <Sparkles
              className="w-6 h-6 text-[#0A2342] group-hover:rotate-12 transition-transform duration-180"
              strokeWidth={2}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          className="mb-2 bg-[#0A2342] border-[#1A3A6B] text-white text-[12px] font-semibold"
        >
          誠問 AI 助手 (⌘K)
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
