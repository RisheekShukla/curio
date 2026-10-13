import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AppShell } from "@/components/app-shell";
import { CurioProvider } from "@/components/providers/curio-provider";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { getAIMode, getStorageMode } from "@/lib/server/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Curio — discover something worth wondering about", template: "%s · Curio" },
  description: "A personalised, image-led feed of discoveries across science, history, nature and culture, with an AI companion to explore each one.",
  applicationName: "Curio",
  appleWebApp: { capable: true, title: "Curio", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1a18" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

async function currentUserEmail(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getClaims();
    const email = data?.claims?.email;
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = getStorageMode();
  const aiMode = getAIMode(mode);
  const userEmail = mode === "cloud" ? await currentUserEmail() : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <CurioProvider mode={mode} aiMode={aiMode} userEmail={userEmail}>
          <AppShell>{children}</AppShell>
        </CurioProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
