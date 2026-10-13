"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { errorMessage } from "@/lib/client/api-error";
import type { CurioApi, InteractionEvent } from "@/lib/services/curio-service";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

/**
 * Loads data once `api` is ready and whenever `reload()` is called. State is only set in
 * promise callbacks, and stale responses are ignored.
 */
export function useApiResource<T>(api: CurioApi | null, fetcher: (api: CurioApi) => Promise<T>, fallbackError: string) {
  const [state, setState] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  const [version, setVersion] = useState(0);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (!api) return;
    let active = true;
    fetcherRef.current(api).then(
      (data) => active && setState({ data, error: null }),
      (err: unknown) => active && setState((s) => ({ data: s.data, error: errorMessage(err, fallbackError) })),
    );
    return () => {
      active = false;
    };
  }, [api, version, fallbackError]);

  const setData = useCallback((update: (data: T) => T) => {
    setState((s) => (s.data === null ? s : { ...s, data: update(s.data) }));
  }, []);
  const reload = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
    setVersion((v) => v + 1);
  }, []);

  return { data: state.data, error: state.error, setData, reload };
}

// Survives client-side navigation so revisiting Discover doesn't re-log the same impressions.
const sessionImpressions = new Set<string>();

/**
 * Logs an impression once a card has been at least half visible for a second, batching
 * events so scrolling doesn't fire a request per card.
 */
export function useImpressionTracker(api: CurioApi | null) {
  const queue = useRef<InteractionEvent[]>([]);
  const timers = useRef(new Map<Element, ReturnType<typeof setTimeout>>());
  const observer = useRef<IntersectionObserver | null>(null);
  const elements = useRef(new Set<HTMLElement>());

  const flush = useCallback(() => {
    if (!api || !queue.current.length) return;
    const events = queue.current.splice(0, 30);
    api.recordInteractions(events).catch(() => {
      // Impressions are best-effort signals; dropping them is acceptable.
    });
  }, [api]);

  useEffect(() => {
    const timerMap = timers.current;
    observer.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.discoveryId;
          if (!id) continue;
          if (entry.isIntersecting) {
            if (sessionImpressions.has(id) || timerMap.has(entry.target)) continue;
            timerMap.set(
              entry.target,
              setTimeout(() => {
                sessionImpressions.add(id);
                queue.current.push({ discoveryId: id, type: "impression" });
              }, 1000),
            );
          } else {
            clearTimeout(timerMap.get(entry.target));
            timerMap.delete(entry.target);
          }
        }
      },
      { threshold: 0.5 },
    );
    elements.current.forEach((el) => observer.current?.observe(el));
    const interval = setInterval(flush, 4000);
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      observer.current?.disconnect();
      timerMap.forEach(clearTimeout);
      timerMap.clear();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  return useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const els = elements.current;
    els.add(el);
    observer.current?.observe(el);
    return () => {
      els.delete(el);
      observer.current?.unobserve(el);
    };
  }, []);
}
