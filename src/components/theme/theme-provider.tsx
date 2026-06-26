"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * App theme provider — UI/UX workstream (UIX-001).
 *
 * Two themes (dark + light) on top of the existing ARC-003 paper/ink/hairline
 * token system. Dark is the primary experience for now (operator decision
 * 2026-06-26); light is developed afterward. `attribute="class"` maps onto the
 * `.dark` block in globals.css, so no token has to move to switch themes.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
