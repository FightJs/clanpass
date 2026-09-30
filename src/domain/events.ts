export type EventType = "gold" | "event" | "lab" | "ink";

export interface CalendarEvent {
  id: string;
  name: string;
  start: number;
  end: number;
  type: EventType;
  tip: string;
  desc: string;
  ongoing: boolean;
}

const DAY = 86_400_000;

function at(y: number, m: number, d: number, hh = 8) {
  return Date.UTC(y, m, d, hh, 0, 0);
}

/** 公开周期事件（UTC 规则推算，展示时用本地时区） */
export function nextEvents(now = new Date()): CalendarEvent[] {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const t = now.getTime();

  const seasonEnd = at(y, m, 1, 8);
  const clanGamesStart = at(y, m, 22, 8);
  const clanGamesEnd = at(y, m, 28, 8);
  const cwlStart = at(y, m + 1, 1, 8);
  const capitalStart = (() => {
    const d = new Date(t);
    d.setUTCHours(8, 0, 0, 0);
    const day = d.getUTCDay();
    const toFri = (5 - day + 7) % 7;
    d.setUTCDate(d.getUTCDate() + toFri);
    return d.getTime();
  })();

  const list = [
    {
      id: "clan_games",
      name: "部落冲突 Clan Games",
      start: clanGamesStart,
      end: clanGamesEnd,
      type: "event" as EventType,
      tip: "领奖别错过",
      desc: "每月 22–28 日 · 约 6 天",
    },
    {
      id: "season",
      name: "赛季结束 · Hoggy Bank",
      start: seasonEnd,
      end: seasonEnd + 3600000,
      type: "gold" as EventType,
      tip: "别爆仓",
      desc: "月初 16:00 结算",
    },
    {
      id: "cwl",
      name: "CWL 报名",
      start: cwlStart,
      end: cwlStart + 2 * DAY,
      type: "event" as EventType,
      tip: "别排英雄",
      desc: "每月 1 日起 2 天",
    },
    {
      id: "capital",
      name: "都城袭击周末",
      start: capitalStart,
      end: capitalStart + 3 * DAY,
      type: "lab" as EventType,
      tip: "留出进攻",
      desc: "周五 → 周一",
    },
    {
      id: "league",
      name: "联赛重置",
      start: at(y, m, 15, 5),
      end: at(y, m, 15, 6),
      type: "ink" as EventType,
      tip: "重置前冲杯",
      desc: "约 28 天周期",
    },
  ];

  return list
    .map((e) => {
      let s = e.start;
      const dur = Math.max(e.end - e.start, 3600000);
      while (s + dur <= t) s += 28 * DAY;
      while (s > t + 40 * DAY) s -= 28 * DAY;
      const end = s + dur;
      return {
        ...e,
        start: s,
        end,
        ongoing: t >= s && t < end,
      };
    })
    .sort((a, b) => {
      if (a.ongoing !== b.ongoing) return a.ongoing ? -1 : 1;
      return a.start - b.start;
    });
}
