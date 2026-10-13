"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { createDemoApi } from "@/lib/client/demo-api";
import { createHttpApi } from "@/lib/client/http-api";
import type { CurioApi } from "@/lib/services/curio-service";

export type StorageMode = "demo" | "cloud";
export type AIMode = "live" | "mock";

interface CurioContextValue {
  /** Null during server rendering; views show their loading state until hydrated. */
  api: CurioApi | null;
  mode: StorageMode;
  aiMode: AIMode;
  userEmail: string | null;
}

const CurioContext = createContext<CurioContextValue | null>(null);

export function CurioProvider({
  mode,
  aiMode,
  userEmail,
  children,
}: {
  mode: StorageMode;
  aiMode: AIMode;
  userEmail: string | null;
  children: ReactNode;
}) {
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const api = useMemo(() => {
    if (!isClient) return null;
    return mode === "demo" ? createDemoApi() : createHttpApi();
  }, [mode, isClient]);

  const value = useMemo(() => ({ api, mode, aiMode, userEmail }), [api, mode, aiMode, userEmail]);
  return <CurioContext.Provider value={value}>{children}</CurioContext.Provider>;
}

const subscribeNoop = () => () => {};

export function useCurio(): CurioContextValue {
  const ctx = useContext(CurioContext);
  if (!ctx) throw new Error("useCurio must be used inside CurioProvider");
  return ctx;
}
