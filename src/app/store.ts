import { create } from "zustand";
import type { NotifySettings, VillageSnapshot } from "@/domain/types";
import { defaultNotifySettings } from "@/domain/types";
import { loadState, saveState, clearState } from "@/data/storage";

export type AppTab = "timer" | "progress" | "events" | "settings" | "notify";

interface AppStore {
  tab: AppTab;
  snapshot: VillageSnapshot | null;
  settings: NotifySettings;
  progressFilter: "all" | "unmet" | "upgrading";
  progressTab: string;
  setTab: (tab: AppTab) => void;
  setSnapshot: (snapshot: VillageSnapshot | null) => void;
  setSettings: (patch: Partial<NotifySettings>) => void;
  setProgressFilter: (f: AppStore["progressFilter"]) => void;
  setProgressTab: (t: string) => void;
  clearData: () => void;
}

const initial = loadState();

export const useAppStore = create<AppStore>((set, get) => ({
  tab: "timer",
  snapshot: initial.snapshot,
  settings: initial.settings,
  progressFilter: "unmet",
  progressTab: "hero",
  setTab: (tab) => set({ tab }),
  setSnapshot: (snapshot) => {
    set({ snapshot });
    saveState({ snapshot, settings: get().settings });
  },
  setSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    saveState({ snapshot: get().snapshot, settings });
  },
  setProgressFilter: (progressFilter) => set({ progressFilter }),
  setProgressTab: (progressTab) => set({ progressTab }),
  clearData: () => {
    clearState();
    set({ snapshot: null, settings: { ...defaultNotifySettings }, tab: "timer" });
  },
}));
