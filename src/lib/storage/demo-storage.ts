import { emptyData, MemoryRepository, type MemoryData } from "./memory-repository";
import type { Discovery } from "../types";

export const DEMO_STORAGE_KEY = "curio:demo:v1";
export const DEMO_USER_ID = "demo-user";

/** Minimal subset of the Web Storage API, injectable for tests. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function loadDemoData(storage: KeyValueStorage): MemoryData {
  try {
    const raw = storage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as Partial<MemoryData>;
    if (parsed?.version !== 1) return emptyData();
    return { ...emptyData(), ...parsed } as MemoryData;
  } catch {
    return emptyData();
  }
}

export function saveDemoData(storage: KeyValueStorage, data: MemoryData) {
  try {
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Likely quota exceeded: drop passive impressions (the least valuable data) and retry once.
    data.interactions = data.interactions.filter((i) => i.type !== "impression");
    try {
      storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
    } catch {
      console.warn("Curio demo storage is full; recent changes may not persist.");
    }
  }
}

/** Demo-mode repository persisted to localStorage (this browser only, never synced). */
export function createDemoRepository(storage: KeyValueStorage, discoveries: Discovery[]) {
  return new MemoryRepository(DEMO_USER_ID, discoveries, loadDemoData(storage), (data) => saveDemoData(storage, data));
}

export function clearDemoData(storage: KeyValueStorage) {
  storage.removeItem(DEMO_STORAGE_KEY);
}
