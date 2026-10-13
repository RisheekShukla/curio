"use client";

import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ initialError }: { initialError: string | null }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(initialError);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError(null);
    const next = new URLSearchParams(window.location.search).get("next");
    const callback = new URL("/auth/callback", window.location.origin);
    if (next?.startsWith("/") && !next.startsWith("//")) callback.searchParams.set("next", next);
    const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callback.toString() },
    });
    if (error) {
      setError(error.status === 429 ? "Too many attempts. Please wait a minute and try again." : "We couldn't send a sign-in link. Check the address and try again.");
      setState("idle");
    } else {
      setState("sent");
    }
  };

  if (state === "sent") {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-center" role="status">
        <Mail className="mx-auto mb-3 size-6 text-accent" aria-hidden />
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-sm text-muted-foreground">We sent a sign-in link to {email}. Open it on this device.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-3xl border border-border bg-card p-6">
      <label htmlFor="email" className="text-sm font-medium">
        Email address
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-foreground/40"
        placeholder="you@example.com"
      />
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full justify-center" disabled={state === "sending"}>
        {state === "sending" && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Email me a sign-in link
      </Button>
      <p className="text-center text-xs text-muted-foreground">No password needed. We only use your email to sign you in.</p>
    </form>
  );
}
