import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/auth/",
  "/offline.html",
  "/manifest.webmanifest",
  "/sw.js",
  "/theme-init.js",
  "/icons/",
  "/fallbacks/",
];

// In development, replace any worker left over from a local production run so it stops serving stale chunks.
const DEV_KILL_SWITCH_SW = `self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("curio-")).map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((client) => client.navigate(client.url));
  })());
});
`;

/** Refreshes the Supabase session cookie and sends signed-out visitors to /login (cloud mode only). */
export async function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "production" && request.nextUrl.pathname === "/sw.js") {
    return new NextResponse(DEV_KILL_SWITCH_SW, {
      headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const forceDemo = process.env.CURIO_FORCE_DEMO === "1" || process.env.CURIO_FORCE_DEMO === "true";
  if (!url || !anonKey || forceDemo) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (path === "/") {
    if (!data.user) return response;
    const discover = request.nextUrl.clone();
    discover.pathname = "/discover";
    return NextResponse.redirect(discover);
  }

  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p));

  // API routes answer 401 themselves; only page navigations are redirected.
  if (!data.user && !isPublic && !path.startsWith("/api/")) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
