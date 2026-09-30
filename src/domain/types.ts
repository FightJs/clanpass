export type JobLane = "builder" | "lab" | "goblin" | "unknown";

export interface UpgradeJob {
  id: string;
  kind: string;
  section: string;
  itemId: string | number;
  name: string;
  currentLevel: number | null;
  targetLevel: number | null;
  remainingSecAtImport: number;
  importedAt: number;
  finishAt: number;
  lane: JobLane;
  isGoblin: boolean;
  source: "export" | "sample" | "manual";
}

export interface ProgressData {
  buildingPct: number;
  wallPct: number;
  leftItems: number;
  heroes: Array<{ name: string; level: number; maxLevel: number }>;
  units: Array<{ name: string; level: number; maxLevel: number }>;
}

export interface VillageSnapshot {
  schemaVersion: 1;
  importedAt: number;
  source: "paste" | "sample" | "file";
  jobs: UpgradeJob[];
  buildingCount: number;
  boosts: Record<string, unknown>;
  rawSections: string[];
  warnings: string[];
  progress: ProgressData;
}

export interface NotifySettings {
  notifyBuilder: boolean;
  notifyLab: boolean;
  notifyOther: boolean;
  notifyEvent: boolean;
  leadMinutes: number;
  quietEnabled: boolean;
  goldDiscount: number;
}

export const defaultNotifySettings: NotifySettings = {
  notifyBuilder: true,
  notifyLab: true,
  notifyOther: true,
  notifyEvent: true,
  leadMinutes: 15,
  quietEnabled: false,
  goldDiscount: 0,
};
