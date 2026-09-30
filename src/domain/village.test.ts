import { describe, expect, it } from "vitest";
import { parseVillage, sampleSnapshot } from "@/domain/village";
import { formatDuration, formatClock } from "@/domain/time";
import {
  buildNotifyItems,
  filterQuiet,
  isQuietHour,
} from "@/domain/notify";
import type { NotifySettings, UpgradeJob } from "@/domain/types";
import { defaultNotifySettings } from "@/domain/types";

const settings: NotifySettings = {
  ...defaultNotifySettings,
  leadMinutes: 15,
  quietEnabled: false,
};

function job(partial: Partial<UpgradeJob> & Pick<UpgradeJob, "id" | "finishAt">): UpgradeJob {
  return {
    kind: "building",
    section: "buildings",
    itemId: 1,
    name: "箭塔",
    currentLevel: 11,
    targetLevel: 12,
    remainingSecAtImport: 3600,
    importedAt: partial.finishAt - 3600_000,
    lane: "builder",
    isGoblin: false,
    source: "export",
    ...partial,
  } as UpgradeJob;
}

describe("parseVillage", () => {
  it("rejects invalid JSON", () => {
    const r = parseVillage("not-json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("JSON");
  });

  it("rejects object without known sections", () => {
    const r = parseVillage(JSON.stringify({ foo: 1 }));
    expect(r.ok).toBe(false);
  });

  it("parses timers into jobs with finishAt = importedAt + remainingSec", () => {
    const r = parseVillage(
      JSON.stringify({
        buildings: [{ data: 1000001, lvl: 11, cnt: 1, timer: 3600 }],
        units: [{ data: 1, name: "野蛮人", lvl: 12, timer: 7200 }],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.snapshot.jobs).toHaveLength(2);
    const building = r.snapshot.jobs[0];
    expect(building.lane).toBe("builder");
    expect(building.finishAt - building.importedAt).toBe(3600 * 1000);
    const unit = r.snapshot.jobs[1];
    expect(unit.lane).toBe("lab");
    expect(unit.name).toBe("野蛮人");
  });

  it("keeps unknown fields without failing", () => {
    const r = parseVillage(
      JSON.stringify({
        buildings: [{ data: 1, lvl: 2, timer: 10, futureField: "x" }],
        helpers: [{ id: 1 }],
        boosts: { builder_boost: 0 },
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.snapshot.jobs).toHaveLength(1);
  });

  it("warns when helpers missing", () => {
    const r = parseVillage(
      JSON.stringify({ buildings: [{ data: 1, lvl: 1, timer: 5 }] }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.snapshot.warnings.some((w) => w.includes("helpers"))).toBe(true);
  });
});

describe("time format", () => {
  it("formats durations by magnitude", () => {
    expect(formatDuration(2 * 86400_000 + 3 * 3600_000)).toContain("2天");
    expect(formatDuration(5 * 3600_000 + 22 * 60_000)).toContain("5小时");
    expect(formatDuration(45_000)).toContain("45秒");
    expect(formatDuration(0)).toBe("已完成");
  });

  it("formats clock as HH:MM:SS", () => {
    expect(formatClock(3661_000)).toBe("01:01:01");
    expect(formatClock(0)).toBe("00:00:00");
  });
});

describe("notify items", () => {
  const now = 1_700_000_000_000;

  it("creates complete + lead items", () => {
    const items = buildNotifyItems(
      [job({ id: "a", finishAt: now + 60 * 60_000, importedAt: now })],
      settings,
      now,
    );
    expect(items.map((i) => i.kind).sort()).toEqual(["complete", "lead"]);
    const lead = items.find((i) => i.kind === "lead")!;
    expect(lead.fireAt).toBe(now + 45 * 60_000);
  });

  it("skips lead for very short upgrades", () => {
    const items = buildNotifyItems(
      [job({ id: "b", finishAt: now + 8 * 60_000, importedAt: now, remainingSecAtImport: 480 })],
      settings,
      now,
    );
    expect(items.every((i) => i.kind === "complete")).toBe(true);
  });

  it("respects group toggles", () => {
    const items = buildNotifyItems(
      [job({ id: "c", finishAt: now + 3600_000, importedAt: now })],
      { ...settings, notifyBuilder: false },
      now,
    );
    expect(items).toHaveLength(0);
  });

  it("filters quiet hours when enabled", () => {
    const quiet: NotifySettings = { ...settings, quietEnabled: true };
    const night = new Date(now);
    night.setHours(23, 30, 0, 0);
    expect(isQuietHour(night.getTime(), quiet)).toBe(true);
    const day = new Date(now);
    day.setHours(12, 0, 0, 0);
    expect(isQuietHour(day.getTime(), quiet)).toBe(false);
    const list = [
      job({ id: "n", finishAt: night.getTime() + 60_000, importedAt: now }),
    ];
    const built = buildNotifyItems(list, quiet, now);
    expect(built).toHaveLength(0);
    expect(filterQuiet(built, quiet)).toHaveLength(0);
  });
});

describe("sample snapshot", () => {
  it("has jobs with future finishAt except done", () => {
    const s = sampleSnapshot();
    expect(s.jobs.length).toBeGreaterThan(0);
    const running = s.jobs.filter((j) => j.remainingSecAtImport > 0);
    expect(running.every((j) => j.finishAt > j.importedAt)).toBe(true);
  });
});
