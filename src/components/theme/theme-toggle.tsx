"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Dark/light theme toggle — UI/UX workstream (UIX-001).
 *
 * The visible icon is driven by the `.dark` class (CSS `dark:` variants), which
 * next-themes sets on <html> before hydration — so there is no `mounted` state,
 * no setState-in-effect (forbidden by the repo's React 19 lint rule), and no
 * hydration mismatch. Reduced-motion safe: the only motion is the global icon
 * transition, which respects prefers-reduced-motion.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  function toggle() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label="切換深色／淺色主題"
      title="切換深色／淺色主題"
      onClick={toggle}
    >
      {/* Sun shows in dark mode (click → light); Moon shows in light mode (click → dark) */}
      <Sun className="hidden size-[18px] dark:block" strokeWidth={1.75} aria-hidden />
      <Moon className="block size-[18px] dark:hidden" strokeWidth={1.75} aria-hidden />
      <span className="sr-only">切換深色／淺色主題</span>
    </Button>
  );
}
