import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck, UserRound } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SurfaceTone = "app" | "client" | "platform";

const surfaceStyles: Record<SurfaceTone, string> = {
  app: "border-[#1A3A6B]/20 bg-[#1A3A6B]/5 text-[#1A3A6B]",
  client: "border-[#2E7D32]/20 bg-[#2E7D32]/5 text-[#1B5E20]",
  platform: "border-ink/20 bg-ink/5 text-ink",
};

export function AuthSurfaceShell({
  eyebrow,
  title,
  description,
  surface,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  surface: SurfaceTone;
  children: React.ReactNode;
  aside: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <section className="flex min-h-[calc(100vh-4rem)] flex-col justify-center">
          <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="grid size-8 place-items-center rounded-lg bg-[#1A3A6B] text-xs font-bold text-white">
              誠
            </span>
            誠問 AI
          </Link>

          <div className="max-w-2xl">
            <span
              className={cn(
                "mb-5 inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                surfaceStyles[surface]
              )}
            >
              {eyebrow}
            </span>
            <h1 className="max-w-[12ch] text-balance text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-ink md:text-7xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              {description}
            </p>
          </div>

          <div className="mt-10 max-w-xl">{children}</div>
        </section>

        <aside className="flex items-center">{aside}</aside>
      </div>
    </main>
  );
}

export function AuthFormCard({
  title,
  description,
  fields,
  primaryLabel,
  helper,
}: {
  title: string;
  description: string;
  fields: Array<{ id: string; label: string; type?: string; placeholder: string }>;
  primaryLabel: string;
  helper: React.ReactNode;
}) {
  return (
    <Card className="bg-surface">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {fields.map((field) => (
            <label key={field.id} className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">{field.label}</span>
              <Input
                id={field.id}
                name={field.id}
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                aria-label={field.label}
              />
            </label>
          ))}
        </div>

        <button
          type="button"
          className={buttonVariants({ variant: "mono", size: "lg", className: "w-full" })}
          aria-label={`${primaryLabel}，待接正式 auth provider`}
        >
          {primaryLabel}
          <ArrowRight className="size-4" />
        </button>

        <div className="rounded-lg border border-hairline bg-paper-2 px-3 py-2 text-xs leading-5 text-muted-foreground">
          {helper}
        </div>
      </CardContent>
    </Card>
  );
}

export function SurfaceRuleCard({
  title,
  items,
  icon = "app",
}: {
  title: string;
  items: string[];
  icon?: "app" | "client" | "platform";
}) {
  const Icon = icon === "platform" ? ShieldCheck : icon === "client" ? UserRound : Building2;

  return (
    <Card size="sm" className="w-full bg-paper">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-[#1A3A6B]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#1A3A6B]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function AuthLinkRow({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">{children}</div>;
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-ink underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
