import { ArrowRight, Compass, Eye, Layers, MessageCircleQuestion, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { DiscoveryImage, ImageCredit } from "@/components/discovery-image";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonClasses } from "@/components/ui/button";
import { SEED_DISCOVERIES } from "@/lib/content/seed-discoveries";
import { getStorageMode } from "@/lib/server/config";
import { CATEGORY_LABELS, type Discovery } from "@/lib/types";
import { cn } from "@/lib/utils";

const pick = (slugs: string[]) =>
  slugs.map((s) => SEED_DISCOVERIES.find((d) => d.slug === s)).filter((d): d is Discovery => !!d);

const HERO = pick(["great-wave", "auroras", "antikythera-mechanism"]);
const SAMPLES = pick(["black-hole-formation", "roman-concrete", "octopus-intelligence"]);

const firstSentence = (text: string) => text.split(/(?<=[.!?])\s/)[0] ?? text;

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-foreground">
        <span className="size-3 rounded-full border-2 border-background" />
      </span>
      <span className="font-serif text-2xl tracking-tight">Curio</span>
    </span>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{children}</p>;
}

function HeroCollage() {
  const placements = [
    "left-0 top-6 w-[62%] -rotate-3",
    "right-0 top-0 w-[52%] rotate-2",
    "bottom-0 left-[22%] w-[58%] rotate-1",
  ];
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-xl" aria-hidden>
      {HERO.map((d, i) => (
        <div key={d.id} className={cn("absolute", placements[i])}>
          <div
            className="animate-settle overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-black/5"
            style={{ animationDelay: `${250 + i * 140}ms` }}
          >
            <div className="aspect-[4/3] bg-muted">
              <DiscoveryImage discovery={d} priority sizes="(min-width: 1024px) 360px, 60vw" />
            </div>
            <p className="truncate px-4 py-2.5 font-serif text-sm">{d.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SampleCard({ discovery }: { discovery: Discovery }) {
  const question = discovery.starterQuestions[0];
  return (
    <article className="reveal flex flex-col overflow-hidden rounded-3xl border border-border bg-card">
      <Link href={`/d/${discovery.slug}`} className="group block" prefetch={false}>
        <div className="aspect-[16/10] overflow-hidden bg-muted">
          <DiscoveryImage
            discovery={discovery}
            sizes="(min-width: 768px) 33vw, 100vw"
            className="group-hover:scale-[1.03]"
          />
        </div>
        <div className="p-5 pb-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">{CATEGORY_LABELS[discovery.category]}</p>
          <h3 className="mt-2 font-serif text-xl leading-snug group-hover:underline group-hover:underline-offset-4">
            {discovery.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{firstSentence(discovery.summary)}</p>
        </div>
      </Link>
      <div className="mt-auto px-5 pb-5">
        {question && (
          <Link
            href={`/d/${discovery.slug}?ask=${encodeURIComponent(question)}`}
            prefetch={false}
            className="flex items-start gap-2 rounded-2xl bg-muted px-3 py-2 text-sm transition-colors hover:bg-muted/70"
          >
            <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            {question}
          </Link>
        )}
        <ImageCredit discovery={discovery} className="mt-3" />
      </div>
    </article>
  );
}

const STEPS = [
  {
    Icon: Compass,
    title: "Discover",
    text: "Scroll a short, image-led feed. Each discovery is a two-minute read written to spark a question.",
  },
  {
    Icon: MessageCircleQuestion,
    title: "Ask",
    text: "Tap a suggested question or ask your own. Your AI companion stays anchored to the topic you started from.",
  },
  {
    Icon: Layers,
    title: "Go deeper",
    text: "Follow tangents, save the insights worth keeping, and watch your feed grow with your interests.",
  },
];

const LEARNS = [
  { Icon: Eye, text: "Learns from what you save, like and explore, not from a passing glance." },
  { Icon: Sparkles, text: "Keeps room for surprise: every feed mixes favourites, related ideas and something new." },
  { Icon: SlidersHorizontal, text: "Shows why each discovery appears, and lets you follow, mute or reset any topic." },
];

const PROMISES = [
  "Learns which subjects you enjoy, never personal attributes like health, beliefs or identity.",
  "The AI tells you when something is uncertain or debated, and never invents sources.",
  "No ads, no trackers, no endless autoplay.",
];

export function LandingPage() {
  const demo = getStorageMode() === "demo";
  const startNote = demo ? "Free to try. No sign-up needed." : "Sign in with just your email.";

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" aria-label="Curio home">
          <Logo />
        </Link>
        <nav aria-label="Landing" className="flex items-center gap-3">
          <a href="#how-it-works" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
            How it works
          </a>
          <ThemeToggle className="hidden sm:inline-flex" />
          <Link href="/discover" className={buttonClasses("primary", "sm")}>
            Open Curio
          </Link>
        </nav>
      </header>

      <main id="main">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div className="animate-rise">
            <Eyebrow>For the endlessly curious</Eyebrow>
            <h1 className="mt-4 font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">
              Find something worth wondering about.
            </h1>
            <p
              className="mt-6 max-w-xl animate-rise text-lg leading-relaxed text-foreground/75"
              style={{ animationDelay: "120ms" }}
            >
              Curio is a calm, beautifully illustrated feed of discoveries from science, history, nature and culture.
              Spot something intriguing, ask a question, and follow your curiosity as far as it goes.
            </p>
            <div className="mt-8 flex animate-rise flex-wrap items-center gap-3" style={{ animationDelay: "220ms" }}>
              <Link href="/discover" className={cn(buttonClasses("primary"), "h-12 px-6 text-base")} data-testid="landing-cta">
                Start exploring <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a href="#how-it-works" className={cn(buttonClasses("outline"), "h-12 px-6 text-base")}>
                How it works
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{startNote}</p>
          </div>
          <HeroCollage />
        </section>

        <section aria-labelledby="samples-title" className="border-t border-border bg-card/50">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <Eyebrow>A taste of the library</Eyebrow>
            <h2 id="samples-title" className="mt-3 max-w-2xl font-serif text-3xl tracking-tight sm:text-4xl">
              Small stories with big questions behind them.
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {SAMPLES.map((d) => (
                <SampleCard key={d.id} discovery={d} />
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="how-title" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-20 sm:px-8">
          <Eyebrow>How it works</Eyebrow>
          <h2 id="how-title" className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">
            Three steps from &ldquo;huh&rdquo; to &ldquo;aha&rdquo;.
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ Icon, title, text }, i) => (
              <li key={title} className="reveal rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-background">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Step {i + 1}</span>
                </div>
                <h3 className="mt-5 font-serif text-2xl">{title}</h3>
                <p className="mt-2 leading-relaxed text-foreground/75">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="trust-title" className="border-y border-border bg-card/50">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2">
            <div className="reveal">
              <Eyebrow>Personal, not pushy</Eyebrow>
              <h2 id="trust-title" className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">
                A feed that learns gently.
              </h2>
              <ul className="mt-8 space-y-5">
                {LEARNS.map(({ Icon, text }) => (
                  <li key={text} className="flex gap-4">
                    <Icon className="mt-1 size-5 shrink-0 text-accent" aria-hidden />
                    <span className="leading-relaxed text-foreground/80">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="reveal rounded-3xl border border-border bg-background p-7">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-6 text-accent" aria-hidden />
                <h3 className="font-serif text-2xl">Honest by design</h3>
              </div>
              <ul className="mt-6 space-y-4">
                {PROMISES.map((p) => (
                  <li key={p} className="border-l-2 border-accent/40 pl-4 leading-relaxed text-foreground/80">
                    {p}
                  </li>
                ))}
                {demo && (
                  <li className="border-l-2 border-accent/40 pl-4 leading-relaxed text-foreground/80">
                    While you try it, everything you do stays in this browser.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>

        <section className="reveal mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
          <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">What will you wonder about today?</h2>
          <p className="mt-4 text-lg text-muted-foreground">Black holes, Roman concrete, octopus minds, and many more.</p>
          <Link href="/discover" className={cn(buttonClasses("accent"), "mt-8 h-12 px-7 text-base")}>
            Start exploring <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:px-8">
          <Logo />
          <p>Images from Wikimedia Commons, credited on every discovery.</p>
          <ThemeToggle />
        </div>
      </footer>
    </div>
  );
}
