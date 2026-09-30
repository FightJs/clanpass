import type { NotifySettings, VillageSnapshot } from "@/domain/types";
import { defaultNotifySettings } from "@/domain/types";

const STORE_KEY = "gongtou.v1";

export interface PersistedState {
  snapshot: VillageSnapshot | null;
  settings: NotifySettings;
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { snapshot: null, settings: { ...defaultNotifySettings } };
    const data = JSON.parse(raw) as Partial<PersistedState>;
    return {
      snapshot: data.snapshot ?? null,
      settings: { ...defaultNotifySettings, ...data.settings },
    };
  } catch {
    return { snapshot: null, settings: { ...defaultNotifySettings } };
  }
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // quota / private mode — ignore
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    // ignore
  }
}
