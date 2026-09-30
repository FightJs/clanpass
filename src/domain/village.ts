import type { JobLane, ProgressData, UpgradeJob, VillageSnapshot } from "./types";

const SECTION_META: Record<string, { kind: string; lane: JobLane; label: string }> = {
  buildings: { kind: "building", lane: "builder", label: "建筑" },
  buildings2: { kind: "building", lane: "builder", label: "建筑" },
  traps: { kind: "building", lane: "builder", label: "陷阱" },
  units: { kind: "unit", lane: "lab", label: "兵种" },
  spells: { kind: "spell", lane: "lab", label: "法术" },
  heroes: { kind: "hero", lane: "builder", label: "英雄" },
  pets: { kind: "pet", lane: "lab", label: "战宠" },
  equipment: { kind: "equipment", lane: "builder", label: "装备" },
  siege_machines: { kind: "unit", lane: "lab", label: "攻城" },
};

const NAME_MAP: Record<string, Record<number, string>> = {
  buildings: {
    1000001: "箭塔",
    1000002: "加农炮",
    1000003: "迫击炮",
    1000004: "防空火箭",
    1000005: "法师塔",
    1000006: "特斯拉电磁塔",
    1000007: "X连弩",
    1000008: "地狱之塔",
    1000009: "天鹰火炮",
    1000010: "巨石碑",
    1200001: "金矿",
    1200002: "圣水收集器",
    1200003: "暗黑重油钻井",
  },
  units: {
    1: "野蛮人",
    2: "弓箭手",
    3: "巨人",
    4: "哥布林",
    5: "气球兵",
    6: "法师",
    7: "天使",
    8: "飞龙",
    9: "皮卡超人",
    10: "亡灵",
    11: "野猪骑士",
    12: "瓦基丽武神",
    13: "戈仑石人",
    14: "女巫",
    15: "熔岩猎犬",
    16: "矿工",
    17: "炸弹兵",
  },
  heroes: {
    1: "野蛮人女王",
    2: "野蛮人之王",
    3: "大守护者",
    4: "皇室幽灵",
    5: "战宠机器",
  },
  spells: {
    1: "闪电法术",
    2: "治疗法术",
    3: "狂暴法术",
    4: "弹跳法术",
    5: "冰冻法术",
    6: "镜像法术",
  },
  pets: { 1: "靓仔", 2: "阿胖", 3: "独角", 4: "大牦牛" },
};

function displayName(section: string, id: string | number): string {
  const n = Number(id);
  return NAME_MAP[section]?.[n] || `${section} #${id}`;
}

export function defaultHeroes() {
  return [
    { name: "野蛮人女王", level: 85, maxLevel: 95 },
    { name: "大守护者", level: 55, maxLevel: 65 },
    { name: "战争机器", level: 20, maxLevel: 25 },
    { name: "幻影猎手", level: 40, maxLevel: 40 },
  ];
}

export function defaultUnits() {
  return [
    { name: "野蛮人", level: 12, maxLevel: 13 },
    { name: "弓箭手", level: 12, maxLevel: 13 },
    { name: "飞龙", level: 9, maxLevel: 11 },
    { name: "皮卡超人", level: 10, maxLevel: 12 },
  ];
}

export type ParseResult =
  | { ok: true; snapshot: VillageSnapshot }
  | { ok: false; error: string };

export function parseVillage(rawText: string): ParseResult {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "内容不是有效的 JSON，请重新复制 Data Export" };
  }
  if (!data || typeof data !== "object") {
    return { ok: false, error: "内容不是有效的村庄导出" };
  }
  const sections = Object.keys(data).filter((k) => Array.isArray(data[k]));
  if (!sections.some((s) => ["buildings", "units", "heroes", "spells"].includes(s))) {
    return { ok: false, error: "缺少 buildings/units 等关键区块，不像村庄导出" };
  }

  const jobs: UpgradeJob[] = [];
  const warnings: string[] = [];
  let buildingCount = 0;
  const importedAt = Date.now();

  for (const [section, items] of Object.entries(data)) {
    if (!Array.isArray(items)) continue;
    const meta = SECTION_META[section];
    for (const item of items as Array<Record<string, unknown>>) {
      if (!item || typeof item !== "object") continue;
      const cnt = (item.cnt ?? item.count ?? 1) as number;
      if (section === "buildings" || section === "traps" || section === "buildings2") {
        buildingCount += typeof cnt === "number" ? cnt : 1;
      }
      const remainingSec = item.timer;
      if (remainingSec == null) continue;
      const sec = Number(remainingSec);
      if (!Number.isFinite(sec) || sec < 0) continue;
      const id = (item.data ?? item.id ?? jobs.length) as string | number;
      const isGoblin = !!(item.extra || item.is_goblin);
      const lvl = (item.lvl ?? item.level) as number | null | undefined;
      jobs.push({
        id: `job_${section}_${id}_${lvl ?? ""}`,
        kind: meta?.kind ?? "custom",
        section,
        itemId: id,
        name: (item.name as string) || displayName(section, id),
        currentLevel: lvl ?? null,
        targetLevel: lvl != null ? lvl + 1 : null,
        remainingSecAtImport: sec,
        importedAt,
        finishAt: importedAt + sec * 1000,
        lane: isGoblin ? "goblin" : meta?.lane ?? "unknown",
        isGoblin,
        source: "export",
      });
    }
  }

  if (!data.helpers) warnings.push("缺少 helpers（助手数据）");
  if (data.boosts) warnings.push("Boost 可能与游戏内略有偏差");
  if (!jobs.length) warnings.push("未发现进行中的升级（timer）");

  return {
    ok: true,
    snapshot: {
      schemaVersion: 1,
      importedAt,
      source: "paste",
      jobs,
      buildingCount,
      boosts: (data.boosts as Record<string, unknown>) ?? {},
      rawSections: sections,
      warnings,
      progress: buildProgressFromExport(data),
    },
  };
}

function buildProgressFromExport(data: Record<string, unknown>): ProgressData {
  const heroesRaw = (data.heroes as Array<Record<string, unknown>>) || [];
  const heroes = heroesRaw.map((h) => ({
    name: (h.name as string) || displayName("heroes", (h.data ?? h.id) as number),
    level: Number(h.lvl ?? h.level ?? 1),
    maxLevel: Number(h.max ?? h.maxLevel ?? 95),
  }));
  const unitsRaw = (data.units as Array<Record<string, unknown>>) || [];
  const units = unitsRaw.slice(0, 8).map((u) => ({
    name: (u.name as string) || displayName("units", (u.data ?? u.id) as number),
    level: Number(u.lvl ?? u.level ?? 1),
    maxLevel: Number(u.max ?? u.maxLevel ?? 13),
  }));
  const buildings = (data.buildings as Array<Record<string, unknown>>) || [];
  const sumLevel = buildings.reduce(
    (a, b) => a + Number(b.lvl ?? b.level ?? 0) * Number(b.cnt ?? 1),
    0,
  );
  const sumMax =
    buildings.reduce((a, b) => a + Number(b.max ?? 15) * Number(b.cnt ?? 1), 0) || 1;
  return {
    buildingPct: Math.min(100, Math.round((sumLevel / sumMax) * 100)) || 78,
    wallPct: 62,
    leftItems: 23,
    heroes: heroes.length ? heroes : defaultHeroes(),
    units: units.length ? units : defaultUnits(),
  };
}

export function sampleSnapshot(): VillageSnapshot {
  const importedAt = Date.now();
  const mk = (
    id: string,
    section: string,
    name: string,
    from: number,
    to: number,
    remainSec: number,
    lane: JobLane,
  ): UpgradeJob => ({
    id,
    kind: "building",
    section,
    itemId: name,
    name,
    currentLevel: from,
    targetLevel: to,
    remainingSecAtImport: remainSec,
    importedAt,
    finishAt: importedAt + remainSec * 1000,
    lane,
    isGoblin: false,
    source: "sample",
  });
  return {
    schemaVersion: 1,
    importedAt,
    source: "sample",
    buildingCount: 128,
    rawSections: ["buildings", "units", "heroes"],
    warnings: ["示例数据 · Boost 可能与游戏内略有偏差"],
    boosts: {},
    jobs: [
      mk("job_s1", "buildings", "箭塔", 11, 12, 2 * 86400 + 3 * 3600 + 15 * 60, "builder"),
      mk("job_s2", "buildings", "巨石碑", 10, 11, 4 * 60 + 45, "builder"),
      mk("job_s3", "buildings", "金矿", 16, 17, 0, "builder"),
      mk("job_s4", "units", "野蛮人", 12, 13, 5 * 3600 + 22 * 60, "lab"),
    ],
    progress: {
      buildingPct: 78,
      wallPct: 62,
      leftItems: 23,
      heroes: defaultHeroes(),
      units: defaultUnits(),
    },
  };
}

export function samplePasteJson(): string {
  return JSON.stringify({
    buildings: [
      { data: 1000001, lvl: 11, cnt: 1, timer: 2 * 86400 + 3 * 3600 + 15 * 60 },
      { data: 1000010, lvl: 10, cnt: 1, timer: 4 * 60 + 45 },
      { data: 1200001, lvl: 16, cnt: 4, timer: 0 },
    ],
    units: [{ data: 1, name: "野蛮人", lvl: 12, timer: 5 * 3600 + 22 * 60 }],
    heroes: [{ data: 1, name: "野蛮人女王", lvl: 85, max: 95 }],
    boosts: { builder_boost: 0 },
  });
}
