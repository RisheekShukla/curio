"use client";

import { useEffect } from "react";

/** Registers the service worker in production only; in development it would cache stale bundles. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // A worker left over from a local production run would serve stale dev bundles.
      void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      void caches.keys().then((keys) => keys.filter((k) => k.startsWith("curio-")).forEach((k) => caches.delete(k)));
      return;
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Installability is a progressive enhancement; the app works without it.
    });
  }, []);
  return null;
}
