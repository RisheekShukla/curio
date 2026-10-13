"use client";

import { Bookmark, Compass, History, LogOut, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCurio } from "@/components/providers/curio-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/discover", label: "Discover", Icon: Compass },
  { href: "/saved", label: "Saved", Icon: Bookmark },
  { href: "/history", label: "History", Icon: History },
  { href: "/interests", label: "My Interests", Icon: SlidersHorizontal },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/discover" ? pathname === "/discover" || pathname.startsWith("/d/") : pathname.startsWith(href);
}

function Logo() {
  return (
    <Link href="/discover" className="flex items-center gap-2" aria-label="Curio home">
      <span aria-hidden className="relative flex size-7 items-center justify-center rounded-full bg-foreground">
        <span className="size-3 rounded-full border-2 border-background" />
      </span>
      <span className="font-serif text-2xl tracking-tight">Curio</span>
    </Link>
  );
}

function ModeBadge({ compact = false }: { compact?: boolean }) {
  const { mode, aiMode } = useCurio();
  if (mode === "cloud" && aiMode === "live") return null;
  const text =
    mode === "demo"
      ? "Demo mode: data is stored only in this browser."
      : "AI provider not configured: chat replies are demo templates.";
  return (
    <p
      className={cn(
        "rounded-full border border-accent/30 bg-accent/10 text-accent",
        compact ? "px-2.5 py-1 text-[11px] font-medium" : "px-3 py-2 text-xs leading-snug",
      )}
      title={text}
      data-testid="mode-badge"
    >
      {compact ? (mode === "demo" ? "Demo mode" : "Demo AI") : text}
    </p>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { mode, userEmail } = useCurio();
  if (pathname.startsWith("/login")) return <main className="min-h-dvh">{children}</main>;
  // The landing page provides its own header, main and footer.
  if (pathname === "/") return <>{children}</>;

  return (
    <div className="min-h-dvh md:pl-60">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background">
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-background px-4 py-6 md:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav aria-label="Main" className="mt-10 flex-1">
          <ul className="space-y-1">
            {NAV.map(({ href, label, Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors",
                      active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="space-y-3">
          <ModeBadge />
          {mode === "cloud" && userEmail && (
            <form action="/auth/signout" method="post" className="flex items-center justify-between gap-2 px-2">
              <span className="truncate text-xs text-muted-foreground" title={userEmail}>
                {userEmail}
              </span>
              <button type="submit" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Sign out" title="Sign out">
                <LogOut className="size-4" aria-hidden />
              </button>
            </form>
          )}
          <div className="px-2">
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <ModeBadge compact />
          <ThemeToggle />
          {mode === "cloud" && userEmail && (
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-full p-1.5 text-muted-foreground" aria-label="Sign out">
                <LogOut className="size-4" aria-hidden />
              </button>
            </form>
          )}
        </div>
      </header>

      <main id="main" className="px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-10">
        <div key={pathname} className="animate-fade">
          {children}
        </div>
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px]",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className={cn("size-5", active && "text-accent")} aria-hidden />
                  {label === "My Interests" ? "Interests" : label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
