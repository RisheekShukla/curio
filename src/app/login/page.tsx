import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getStorageMode } from "@/lib/server/config";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (getStorageMode() === "demo") redirect("/discover");
  const { error } = await searchParams;
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-5xl tracking-tight">Curio</h1>
          <p className="mt-2 text-muted-foreground">Discover something worth wondering about.</p>
        </div>
        <LoginForm initialError={error ? "That sign-in link is invalid or has expired. Please request a new one." : null} />
      </div>
    </div>
  );
}
