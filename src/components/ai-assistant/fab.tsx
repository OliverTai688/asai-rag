"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
          <Button
            size="icon"
            className="w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 transition-all hover:scale-110 active:scale-95 group"
          >
            <Sparkles className="w-7 h-7 text-white group-hover:rotate-12 transition-transform" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="mb-2 bg-zinc-900 border-zinc-800 text-white font-medium">
          誠問 AI 助手 (⌘K)
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
