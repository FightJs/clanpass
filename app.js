/* 工头 · App logic */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const STORE_KEY = "gongtou.v1";

  const defaultSettings = {
    notifyBuilder: true,
    notifyLab: true,
    notifyOther: true,
    notifyEvent: true,
    leadMinutes: 15,
    quietEnabled: false,
    goldDiscount: 0,
  };

  const state = {
    tab: "timer",
    snapshot: null,
    settings: { ...defaultSettings },
    sheetJobId: null,
    progressFilter: "unmet",
    progressTab: "hero",
  };

  // —— storage ——
  function save() {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        snapshot: state.snapshot,
        settings: state.settings,
      })
    );
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.snapshot) state.snapshot = data.snapshot;
      if (data.settings) state.settings = { ...defaultSettings, ...data.settings };
    } catch (_) {}
  }

  // —— time helpers ——
  function formatDuration(ms) {
    if (ms <= 0) return "已完成";
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}天 ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    if (h > 0) return `${h}小时 ${m}分`;
    if (m > 0) return `${m}分 ${String(sec).padStart(2, "0")}秒`;
    return `${sec}秒`;
  }
  function formatClock(ms) {
    if (ms <= 0) return "00:00:00";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
  }
  function formatAbs(ts) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  function relImported(importedAt) {
    const diff = Date.now() - importedAt;
    if (diff < 60_000) return "刚刚";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
    return `${Math.floor(diff / 86_400_000)} 天前`;
  }

  // —— village parse ——
  const SECTION_META = {
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

  function parseVillage(rawText) {
    let data;
    try {
      data = JSON.parse(rawText);
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

    const jobs = [];
    const warnings = [];
    let buildingCount = 0;
    const importedAt = Date.now();

    for (const [section, items] of Object.entries(data)) {
      if (!Array.isArray(items)) continue;
      const meta = SECTION_META[section];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const cnt = item.cnt ?? item.count ?? 1;
        if (section === "buildings" || section === "traps" || section === "buildings2") {
          buildingCount += typeof cnt === "number" ? cnt : 1;
        }
        const remainingSec = item.timer;
        if (remainingSec == null) continue;
        const sec = Number(remainingSec);
        if (!Number.isFinite(sec) || sec < 0) continue;
        const id = item.data ?? item.id ?? jobs.length;
        const isGoblin = !!(item.extra || item.is_goblin);
        jobs.push({
          id: `job_${section}_${id}_${item.lvl ?? ""}`,
          kind: meta?.kind ?? "custom",
          section,
          itemId: id,
          name: item.name || displayName(section, id),
          currentLevel: item.lvl ?? item.level ?? null,
          targetLevel: item.lvl != null ? item.lvl + 1 : null,
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
        boosts: data.boosts ?? {},
        rawSections: sections,
        warnings,
        progress: buildProgressFromExport(data),
      },
    };
  }

  function displayName(section, id) {
    const map = {
      buildings: { 1000001: "箭塔", 1000002: "加农炮", 1000003: "迫击炮", 1000004: "防空火箭", 1000005: "法师塔", 1000006: "特斯拉电磁塔", 1000007: "X连弩", 1000008: "地狱之塔", 1000009: "天鹰火炮", 1000010: "巨石碑", 1200001: "金矿", 1200002: "圣水收集器", 1200003: "暗黑重油钻井" },
      units: { 1: "野蛮人", 2: "弓箭手", 3: "巨人", 4: "哥布林", 5: "气球兵", 6: "法师", 7: "天使", 8: "飞龙", 9: "皮卡超人", 10: "亡灵", 11: "野猪骑士", 12: "瓦基丽武神", 13: "戈仑石人", 14: "女巫", 15: "熔岩猎犬", 16: "矿工", 17: "炸弹兵" },
      heroes: { 1: "野蛮人女王", 2: "野蛮人之王", 3: "大守护者", 4: "皇室幽灵", 5: "战宠机器" },
      spells: { 1: "闪电法术", 2: "治疗法术", 3: "狂暴法术", 4: "弹跳法术", 5: "冰冻法术", 6: "镜像法术" },
      pets: { 1: "靓仔", 2: "阿胖", 3: "独角", 4: "大牦牛" },
    };
    return map[section]?.[id] || `${section} #${id}`;
  }

  function buildProgressFromExport(data) {
    const heroes = (data.heroes || []).map((h) => ({
      name: h.name || displayName("heroes", h.data ?? h.id),
      level: h.lvl ?? h.level ?? 1,
      maxLevel: h.max ?? h.maxLevel ?? 95,
    }));
    const units = (data.units || []).slice(0, 8).map((u) => ({
      name: u.name || displayName("units", u.data ?? u.id),
      level: u.lvl ?? u.level ?? 1,
      maxLevel: u.max ?? u.maxLevel ?? 13,
    }));
    const buildings = data.buildings || [];
    const sumLevel = buildings.reduce((a, b) => a + (b.lvl ?? b.level ?? 0) * (b.cnt ?? 1), 0);
    const sumMax = buildings.reduce((a, b) => a + (b.max ?? 15) * (b.cnt ?? 1), 0) || 1;
    return {
      buildingPct: Math.min(100, Math.round((sumLevel / sumMax) * 100)) || 78,
      wallPct: 62,
      leftItems: 23,
      heroes: heroes.length ? heroes : defaultHeroes(),
      units: units.length ? units : defaultUnits(),
    };
  }

  function defaultHeroes() {
    return [
      { name: "野蛮人女王", level: 85, maxLevel: 95 },
      { name: "大守护者", level: 55, maxLevel: 65 },
      { name: "战争机器", level: 20, maxLevel: 25 },
      { name: "幻影猎手", level: 40, maxLevel: 40 },
    ];
  }
  function defaultUnits() {
    return [
      { name: "野蛮人", level: 12, maxLevel: 13 },
      { name: "弓箭手", level: 12, maxLevel: 13 },
      { name: "飞龙", level: 9, maxLevel: 11 },
      { name: "皮卡超人", level: 10, maxLevel: 12 },
    ];
  }

  // —— sample snapshot ——
  function sampleSnapshot() {
    const importedAt = Date.now();
    const mk = (id, section, name, from, to, remainSec, lane) => ({
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
      source: "export",
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

  // —— events (public calendar) ——
  function nextEvents() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const at = (yy, mm, dd, hh = 8) => Date.UTC(yy, mm, dd, hh, 0, 0);

    // approximate month anchors for demo
    const seasonEnd = at(y, m, 1, 8);
    const clanGamesStart = at(y, m, 22, 8);
    const clanGamesEnd = at(y, m, 28, 8);
    const cwlStart = at(y, m + 1, 1, 8);
    const capitalStart = (() => {
      const d = new Date(now);
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
        type: "event",
        tip: "领奖别错过",
        desc: "10/22 16:00 开始 · 6 天",
      },
      {
        id: "season",
        name: "赛季结束 · Hoggy Bank",
        start: seasonEnd,
        end: seasonEnd + 3600000,
        type: "gold",
        tip: "别爆仓",
        desc: "月初 16:00 结算",
      },
      {
        id: "cwl",
        name: "CWL 报名",
        start: cwlStart,
        end: cwlStart + 2 * 86400000,
        type: "event",
        tip: "别排英雄",
        desc: "每月 1 日起 2 天",
      },
      {
        id: "capital",
        name: "都城袭击周末",
        start: capitalStart,
        end: capitalStart + 3 * 86400000,
        type: "lab",
        tip: "留出进攻",
        desc: "周五 → 周一",
      },
      {
        id: "league",
        name: "联赛重置",
        start: at(y, m, 15, 5),
        end: at(y, m, 15, 6),
        type: "ink",
        tip: "重置前冲杯",
        desc: "约 28 天周期",
      },
    ];

    return list
      .map((e) => {
        let s = e.start;
        const dur = Math.max(e.end - e.start, 3600000);
        const t = now.getTime();
        while (s + dur <= t) s += 28 * 86400000;
        while (s > t + 40 * 86400000) s -= 28 * 86400000;
        const end = s + dur;
        return {
          ...e,
          start: s,
          end,
          ongoing: t >= s && t < end,
          remaining: s - t,
        };
      })
      .sort((a, b) => {
        if (a.ongoing !== b.ongoing) return a.ongoing ? -1 : 1;
        return a.start - b.start;
      });
  }

  // —— icons ——
  const icons = {
    timer: `<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>`,
    chart: `<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`,
    settings: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"/></svg>`,
    more: `<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>`,
    back: `<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>`,
    close: `<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    bell: `<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7M10 21a2 2 0 0 0 4 0"/></svg>`,
    alert: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>`,
  };

  // —— render helpers ——
  function statusIcons() {
    return `<div class="icons" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M2 20h3v-6H2v6zm5 0h3V8H7v12zm5 0h3V4h-3v16zm5 0h3v-9h-3v9z"/></svg>
      <svg viewBox="0 0 24 24"><path d="M5 12.5a9 9 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M2 9a15 15 0 0 1 20 0" fill="none" stroke="#E8ECF4" stroke-width="1.8"/></svg>
      <svg viewBox="0 0 24 24"><rect x="2" y="7" width="18" height="10" rx="2" fill="none" stroke="#E8ECF4" stroke-width="1.8"/><path d="M22 10v4" stroke="#E8ECF4" stroke-width="1.8"/><rect x="4" y="9" width="12" height="6" rx="1"/></svg>
    </div>`;
  }

  function tabBar(active) {
    const items = [
      ["timer", "倒计时", "gold"],
      ["progress", "进度", "gold"],
      ["events", "事件", "blue"],
      ["settings", "设置", "gold"],
    ];
    return `<nav class="tab-dock" role="tablist"><div class="tab-bar">
      ${items
        .map(
          ([id, label, tone]) =>
            `<button class="tab-item ${tone} ${active === id ? "active" : ""}" data-tab="${id}" role="tab" aria-selected="${active === id}">
              ${icons[id === "timer" ? "timer" : id === "progress" ? "chart" : id === "events" ? "calendar" : "settings"]}
              <span>${label}</span>
            </button>`
        )
        .join("")}
    </div></nav>`;
  }

  function shell({ title, left = "", right = "", snapshot = false, body, active, center = false }) {
    return `
      <div class="status-bar"><span>9:41</span>${statusIcons()}</div>
      <header class="top-bar">
        <div class="side left">${left}</div>
        <div class="title">${title}</div>
        <div class="side right">${right}</div>
      </header>
      ${snapshot ? snapshotBar() : ""}
      <main class="content ${center ? "center" : ""}">${body}</main>
      ${tabBar(active)}
    `;
  }

  function snapshotBar() {
    if (!state.snapshot) return "";
    return `<div class="snapshot">
      <span>更新于 ${relImported(state.snapshot.importedAt)} · 快照</span>
      <button class="act" data-action="open-import">重新导入</button>
    </div>`;
  }

  function jobCard(job) {
    const remain = job.finishAt - Date.now();
    const done = remain <= 0;
    const almost = !done && remain <= 5 * 60 * 1000;
    const total = Math.max(job.remainingSecAtImport * 1000, 1);
    const pct = Math.min(100, Math.max(0, ((total - remain) / total) * 100));
    const tone = done ? "ok" : almost ? "warn" : job.lane === "lab" ? "lab" : "";
    const badge = done
      ? `<span class="badge ok">已完成</span>`
      : almost
        ? `<span class="badge warn">即将完成</span>`
        : job.lane === "lab"
          ? `<span class="badge lab">研究中</span>`
          : job.lane === "goblin"
            ? `<span class="badge warn">哥布林工</span>`
            : `<span class="badge gold">升级中</span>`;
    const levels =
      job.currentLevel != null
        ? `${job.currentLevel} → ${job.targetLevel}`
        : job.kind === "unit" || job.kind === "spell"
          ? "研究"
          : "进行中";
    return `<button class="cd-card ${done ? "done" : almost ? "almost" : ""}" data-job="${job.id}">
      <div class="cd-head">
        <div class="cd-title"><span class="stripe ${tone}"></span><span>${job.name}</span></div>
        ${badge}
      </div>
      <div class="cd-meta"><span>${levels}</span><span class="finish">完成 ${formatAbs(job.finishAt)}</span></div>
      <div class="cd-time ${tone}">${done ? "已完成" : formatDuration(remain)}</div>
      <div class="progress-track"><div class="progress-fill ${tone}" style="width:${pct}%"></div></div>
    </button>`;
  }

  // —— screens ——
  function screenEmpty() {
    return shell({
      title: "工头",
      active: "timer",
      center: true,
      body: `
        <div class="hero-art"><div class="circle">${icons.timer}</div></div>
        <h1 style="font-size:22px;font-weight:700;margin:8px 0">工人还剩多久 · 到点叫你</h1>
        <p style="font-size:13px;color:var(--ink-2);line-height:1.5;max-width:280px;margin-bottom:8px">
          粘贴游戏内村庄导出，自动算出建筑工与实验室倒计时。
        </p>
        <div class="steps">
          <div class="step"><span class="num">1</span>游戏 → 设置 → 更多设置</div>
          <div class="step"><span class="num">2</span>Data Export → Copy</div>
          <div class="step"><span class="num">3</span>粘贴到工头，看到倒计时</div>
        </div>
        <div style="width:100%;display:flex;flex-direction:column;gap:10px;margin-top:8px">
          <button class="btn btn-primary" data-action="open-import">粘贴村庄数据</button>
          <button class="btn btn-ghost" data-action="load-sample">用示例数据看看</button>
        </div>
        <p class="footer-note" style="margin-top:8px">非官方粉丝工具 · 数据仅存本机</p>
      `,
    });
  }

  function screenTimer() {
    if (!state.snapshot) return screenEmpty();
    const jobs = state.snapshot.jobs || [];
    const builders = jobs.filter((j) => j.lane === "builder" || j.lane === "goblin" || j.lane === "unknown");
    const labs = jobs.filter((j) => j.lane === "lab");
    const sorted = [...builders].sort((a, b) => a.finishAt - b.finishAt);
    const lab = labs[0];
    const earliest = [...jobs].filter((j) => j.finishAt > Date.now()).sort((a, b) => a.finishAt - b.finishAt)[0];
    const doneCount = jobs.filter((j) => j.finishAt <= Date.now()).length;

    const cards = sorted.slice(0, 3).map(jobCard).join("");

    const labRow = lab
      ? `<button class="lab-row" data-job="${lab.id}">
          <span class="stripe"></span>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;font-weight:600">${lab.name} ${lab.currentLevel != null ? `${lab.currentLevel}→${lab.targetLevel}` : ""} · 研究</div>
            <div style="font-size:11px;color:var(--ink-3);margin-top:2px">完成 ${formatAbs(lab.finishAt)}</div>
          </div>
          <div class="time" data-lab-time>${lab.finishAt > Date.now() ? formatDuration(lab.finishAt - Date.now()) : "已完成"}</div>
        </button>`
      : `<div class="lab-row" style="opacity:.7"><span class="stripe"></span><div style="font-size:13px;color:var(--ink-2)">实验室空闲</div></div>`;

    return shell({
      title: "倒计时",
      active: "timer",
      snapshot: true,
      left: `<button class="village" data-action="noop">主号 ${icons.more ? "⌄" : ""}</button>`,
      right: `<button class="icon-btn" data-action="load-sample" title="刷新示例">${icons.refresh}</button>
              <button class="icon-btn" data-action="open-import" title="更多">${icons.more}</button>`,
      body: `
        <section class="overview" aria-live="polite">
          <div class="ov-top">
            <span class="section-label" style="padding:0">最早完成</span>
            <span class="badge gold">${state.snapshot.jobs?.length || 0} 项</span>
          </div>
          <div class="ov-bot">
            <div>
              <div class="ov-big" id="ov-big">${earliest ? formatClock(earliest.finishAt - Date.now()) : "--:--:--"}</div>
              <div class="ov-who">${earliest ? `${earliest.name} · ${earliest.currentLevel ?? ""}${earliest.targetLevel ? "→" + earliest.targetLevel : ""}` : "暂无进行中升级"}</div>
            </div>
            <div style="text-align:right">
              <div class="ov-lab-label">实验室</div>
              <div class="ov-lab-val">${lab ? `${lab.name} ${formatDuration(Math.max(0, lab.finishAt - Date.now()))}` : "空闲"}</div>
            </div>
          </div>
        </section>

        <div class="section-label">建筑工 <span class="right">${sorted.filter((j) => j.finishAt > Date.now()).length} 进行 · ${doneCount} 完成</span></div>
        <div style="display:flex;flex-direction:column;gap:10px">${cards || '<div class="card" style="color:var(--ink-2);font-size:13px">没有进行中的建筑升级</div>'}</div>

        <div class="section-label lab">实验室 <span class="right">研究中</span></div>
        ${labRow}

        <div class="hint-strip">
          <span class="a">${doneCount ? `${doneCount} 项可能已完成` : "1 名工人可能空闲"}</span>
          <span class="b">哥布林 · 夜世界 · 药水</span>
        </div>
        <p class="footer-note">* 加速可能导致游戏内实际完成更早。数据仅存本机。</p>
      `,
    });
  }

  function screenProgress() {
    const p = state.snapshot?.progress || {
      buildingPct: 78,
      wallPct: 62,
      leftItems: 23,
      heroes: defaultHeroes(),
      units: defaultUnits(),
    };
    const heroes = p.heroes;
    const filter = state.progressFilter;
    const rows = heroes
      .filter((h) => {
        if (filter === "unmet") return h.level < h.maxLevel;
        return true;
      })
      .map((h) => {
        const pct = Math.round((h.level / h.maxLevel) * 100);
        const met = h.level >= h.maxLevel;
        const right = met ? "已满" : `差 ${h.maxLevel - h.level} 级`;
        const color = met ? "var(--ok)" : "var(--danger)";
        return `<div class="hero-row">
          <div class="nr"><span class="nm">${h.name}</span><span class="rt" style="color:${color}">${right}</span></div>
          <div class="bar"><i class="${met ? "ok" : ""}" style="width:${pct}%"></i></div>
          <div class="lvl">${h.level}/${h.maxLevel}</div>
        </div>`;
      })
      .join("");

    return shell({
      title: "成长进度",
      active: "progress",
      body: `
        <section class="card">
          <div class="stat-big">
            <span style="font-size:13px;color:var(--ink-2)">建筑完成度</span>
            <span class="pct">${p.buildingPct}%</span>
          </div>
          <div class="progress-track" style="margin-top:10px"><div class="progress-fill" style="width:${p.buildingPct}%"></div></div>
          <div class="stat-foot"><span>城墙 15×40 · 16×30</span><span>TH16 口径</span></div>
        </section>
        <div class="stat-grid">
          <div class="card stat-mini"><div style="font-size:11px;color:var(--ink-3)">还剩满本</div><div class="v">${p.leftItems} 项</div><div class="s">串行约 86 天</div></div>
          <div class="card stat-mini"><div style="font-size:11px;color:var(--ink-3)">城墙</div><div class="v">${p.wallPct}%</div><div class="s">还剩 38 段</div></div>
        </div>
        <div class="segmented" style="margin-top:4px">
          ${["hero", "unit", "spell"].map((t) => `<button class="${state.progressTab === t ? "active" : ""}" data-ptab="${t}">${{ hero: "英雄", unit: "兵种", spell: "法术" }[t]}</button>`).join("")}
          <button data-ptab="pet">战宠</button>
          <button data-ptab="eq">装备</button>
        </div>
        <div class="chips">
          <button class="chip ${filter === "all" ? "active" : ""}" data-pfilter="all">全部</button>
          <button class="chip ${filter === "unmet" ? "active" : ""}" data-pfilter="unmet">仅未满</button>
          <button class="chip ${filter === "upgrading" ? "active" : ""}" data-pfilter="upgrading">升级中</button>
        </div>
        <div class="list">${rows || '<div class="list-row"><span class="sub">没有符合条件的单位</span></div>'}</div>
        <p class="footer-note">完成度按当前大本营可达成满级计算；城墙单独统计。</p>
      `,
    });
  }

  function screenEvents() {
    const events = nextEvents();
    const next = events.find((e) => !e.ongoing && e.start > Date.now()) || events[0];
    const ongoing = events.filter((e) => e.ongoing);
    const upcoming = events.filter((e) => !e.ongoing).slice(0, 4);

    const evCard = (e, isOngoing) => `
      <button class="event-row ${isOngoing ? "ongoing" : ""}" data-action="event-detail">
        <span class="dot" style="background:var(--${e.type === "ink" ? "ink-2" : e.type})"></span>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600">${e.name}</div>
          <div style="font-size:11px;color:${isOngoing ? "var(--warn)" : "var(--ink-2)"};margin-top:2px">
            ${isOngoing ? `进行中 · ${formatDuration(e.end - Date.now())}` : e.desc}
          </div>
        </div>
        <span class="tip">${e.tip}</span>
      </button>`;

    return shell({
      title: "事件日历",
      active: "events",
      right: `<button class="icon-btn" data-action="go-settings">${icons.bell}</button>`,
      body: `
        <section class="event-hero">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="section-label event" style="padding:0">下一个事件</span>
            <span class="badge event">周期活动</span>
          </div>
          <div style="font-size:20px;font-weight:700">${next.name}</div>
          <div class="time" id="event-time">${next.ongoing ? "进行中" : formatDuration(Math.max(0, next.start - Date.now()))}</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:var(--ink-2)">${next.desc}</span>
            <span style="font-size:12px;font-weight:600;color:var(--gold)">领奖别错过 →</span>
          </div>
        </section>
        <div class="section-label">进行中</div>
        ${ongoing.length ? ongoing.map((e) => evCard(e, true)).join("") : '<div class="card" style="font-size:13px;color:var(--ink-2)">当前没有进行中的活动</div>'}
        <div class="section-label">即将发生</div>
        ${upcoming.map((e) => evCard(e, false)).join("")}
        <button class="list-row" style="background:var(--bg-2);border-radius:12px;border:none">
          <span style="font-size:12px;color:var(--ink-2)">已结束 · 2</span>
          <span style="color:var(--ink-3)">⌄</span>
        </button>
        <p class="footer-note">事件时间按 UTC 周期推算并转本地时区，以游戏内为准。</p>
      `,
    });
  }

  function screenSettings() {
    return shell({
      title: "设置",
      active: "settings",
      body: `
        <button class="card" style="display:flex;align-items:center;gap:12px;text-align:left;width:100%" data-action="open-import">
          <div style="width:44px;height:44px;border-radius:22px;background:var(--gold-weak);color:var(--gold);display:grid;place-items:center;font-weight:700;font-size:16px">主</div>
          <div style="flex:1">
            <div style="font-size:16px;font-weight:600">主号</div>
            <div style="font-size:11px;color:var(--ink-2);margin-top:2px">本地村庄 · ${state.snapshot?.jobs?.length || 0} 项进行中${state.snapshot ? " · " + relImported(state.snapshot.importedAt) : ""}</div>
          </div>
          <span style="color:var(--ink-3)">›</span>
        </button>

        <div class="section-label">数据</div>
        <div class="list">
          <button class="list-row" data-action="open-import"><div class="left"><div><div class="name">导入村庄数据</div><div class="sub">粘贴导出</div></div></div><div class="right-val">粘贴导出 ›</div></button>
          <button class="list-row" data-action="export-data"><div class="left"><div><div class="name">数据管理</div><div class="sub">备份 / 清除</div></div></div><div class="right-val">备份/清除 ›</div></button>
          <div class="list-row"><div class="left"><div><div class="name">静态库版本</div><div class="sub">内置精简版</div></div></div><div class="right-val">2026.09 ›</div></div>
        </div>

        <div class="section-label">提醒</div>
        <div class="list">
          <button class="list-row" data-action="go-notify"><div class="left"><div><div class="name" style="color:var(--danger)">通知设置</div><div class="sub">权限与开关</div></div></div><div class="right-val">未开启 ›</div></button>
          <button class="list-row" data-action="go-notify"><div class="left"><div><div class="name">事件偏好</div><div class="sub">周期活动提醒</div></div></div><div class="right-val">已开启 ›</div></button>
        </div>

        <div class="section-label">显示</div>
        <div class="list">
          <div class="list-row"><div class="left"><div><div class="name">主题</div><div class="sub">夜间工棚</div></div></div><div class="right-val">深色 ›</div></div>
          <div class="list-row"><div class="left"><div><div class="name">语言</div><div class="sub">界面语言</div></div></div><div class="right-val">简体中文 ›</div></div>
        </div>

        <div class="section-label">其他</div>
        <div class="list">
          <div class="list-row"><div class="left"><div><div class="name">关于与合规</div><div class="sub">非官方粉丝工具</div></div></div><div class="right-val">›</div></div>
          <div class="list-row"><div class="left"><div><div class="name">反馈与建议</div></div></div><div class="right-val">›</div></div>
        </div>

        <div class="section-label">危险操作</div>
        <div class="list">
          <button class="list-row danger" data-action="clear-data"><div class="left"><div><div class="name">清除本地数据</div></div></div><div class="right-val">›</div></button>
        </div>
        <p class="footer-note">工头 v0.1 · 非官方粉丝工具<br/>数据仅存本机 · 不隶属于 Supercell</p>
      `,
    });
  }

  function screenNotify() {
    const s = state.settings;
    const sw = (on, key) =>
      `<div class="switch ${on ? "on" : ""}" data-toggle="${key}" role="switch" aria-checked="${on}"><div class="knob"></div></div>`;
    return `
      <div class="status-bar"><span>9:41</span>${statusIcons()}</div>
      <header class="top-bar">
        <div class="side left"><button class="icon-btn" data-action="back-settings">${icons.back}</button></div>
        <div class="title">通知设置</div>
        <div class="side right"></div>
      </header>
      <main class="content">
        <section class="card" style="background:var(--danger-weak);border-color:var(--danger);display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;align-items:center;gap:8px;color:var(--danger);font-weight:600;font-size:14px">
            ${icons.bell} 系统通知未开启
          </div>
          <div style="font-size:12px;color:var(--ink-2)">倒计时仍可用。开启后升级完成才能提醒你。</div>
          <button class="btn btn-primary" data-action="request-notify" style="height:44px;font-size:14px">去开启通知</button>
        </section>

        <div class="section-label">提前提醒</div>
        <div class="segmented">
          ${[
            [0, "关"],
            [5, "5 分"],
            [15, "15 分"],
            [60, "1 小时"],
          ]
            .map(([v, l]) => `<button class="${s.leadMinutes === v ? "active" : ""}" data-lead="${v}">${l}</button>`)
            .join("")}
        </div>

        <div class="section-label">通知类型</div>
        <div class="list">
          <div class="list-row"><div class="left"><div><div class="name">建筑工完成</div><div class="sub">到点提醒</div></div></div>${sw(s.notifyBuilder, "notifyBuilder")}</div>
          <div class="list-row"><div class="left"><div><div class="name">实验室完成</div><div class="sub">到点提醒</div></div></div>${sw(s.notifyLab, "notifyLab")}</div>
          <div class="list-row"><div class="left"><div><div class="name">其他进行中</div><div class="sub">哥布林/助手</div></div></div>${sw(s.notifyOther, "notifyOther")}</div>
          <div class="list-row"><div class="left"><div><div class="name">公开事件</div><div class="sub">赛季等</div></div></div>${sw(s.notifyEvent, "notifyEvent")}</div>
          <div class="list-row"><div class="left"><div><div class="name">免打扰 23:00–07:00</div><div class="sub">完全静音</div></div></div>${sw(s.quietEnabled, "quietEnabled")}</div>
        </div>

        <div class="section-label">更多</div>
        <div class="list">
          <div class="list-row"><div class="left"><div class="name">通知历史 · 最近 7 天</div></div><div class="right-val">›</div></div>
          <div class="list-row"><div class="left"><div class="name">导出 ICS 日历</div></div><div class="right-val">›</div></div>
          <div class="list-row"><div class="left"><div class="name">单条升级静音管理</div></div><div class="right-val">›</div></div>
        </div>
        <p class="footer-note">提醒可能因系统省电策略略有延迟。</p>
      </main>
    `;
  }

  function renderImportModal() {
    return `
      <div class="modal" id="import-modal" aria-hidden="true">
        <div class="status-bar"><span>9:41</span>${statusIcons()}</div>
        <header class="top-bar">
          <div class="side left"><button class="icon-btn" data-action="close-import">${icons.close}</button></div>
          <div class="title">导入村庄数据</div>
          <div class="side right"><button class="btn-ghost" style="width:auto;height:auto;font-size:14px;font-weight:600;color:var(--gold)" data-action="show-help">帮助</button></div>
        </header>
        <main class="content">
          <section class="card" style="display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong style="font-size:14px">怎么复制？</strong>
              <span style="color:var(--ink-3)">⌄</span>
            </div>
            <div style="font-size:12px;color:var(--ink-2);line-height:1.5">游戏 → 设置 → 更多设置 → Data Export → Copy。导出是快照，升级后重新复制即可。</div>
            <button class="btn btn-secondary" style="height:32px;width:auto;align-self:flex-start;padding:0 10px;font-size:12px;background:var(--gold-weak);border-color:transparent;color:var(--gold)" data-action="noop">打开游戏设置</button>
          </section>

          <label class="field-label" for="paste-area">粘贴 Data Export 内容</label>
          <textarea class="textarea" id="paste-area" placeholder="buildings / units / spells / heroes …（等待粘贴）" spellcheck="false"></textarea>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary" style="height:44px;font-size:13px" data-action="paste-clip">从剪贴板粘贴</button>
            <button class="btn btn-secondary" style="height:44px;font-size:13px" data-action="load-sample-paste">填入示例</button>
          </div>

          <section class="card" id="preview-card" style="display:none;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong style="font-size:14px">解析预览</strong>
              <span class="badge ok" id="preview-badge">可导入</span>
            </div>
            <div style="display:flex;gap:8px" id="preview-stats"></div>
            <div id="preview-warn" style="background:var(--warn-weak);border-radius:8px;padding:8px;font-size:11px;color:var(--warn);line-height:1.5"></div>
          </section>
          <div id="import-error" style="display:none;background:var(--danger-weak);border-radius:8px;padding:10px;font-size:12px;color:var(--danger)"></div>
          <div style="flex:1"></div>
          <button class="btn btn-primary" id="import-confirm" data-action="confirm-import" disabled>确认导入</button>
          <p class="footer-note">每次导入会重算全部倒计时</p>
        </main>
      </div>
    `;
  }

  function renderSheet() {
    return `
      <div class="overlay" id="sheet-overlay" data-action="close-sheet"></div>
      <div class="sheet" id="job-sheet" role="dialog" aria-modal="true">
        <div class="sheet-handle"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:22px;font-weight:700" id="sheet-name">—</div>
            <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
              <span style="font-family:var(--font-num);font-size:14px;color:var(--ink-2)" id="sheet-levels"></span>
              <span class="badge gold" id="sheet-badge">建筑工</span>
            </div>
          </div>
          <button class="icon-btn" data-action="close-sheet">${icons.close}</button>
        </div>
        <div class="sheet-time-box">
          <div class="t" id="sheet-time">—</div>
          <div style="font-size:12px;color:var(--ink-2)" id="sheet-abs"></div>
          <div class="progress-track" style="width:100%"><div class="progress-fill" id="sheet-progress" style="width:50%"></div></div>
        </div>
        <div class="list" style="background:var(--bg-2);border:none">
          <div class="list-row"><span style="font-size:12px;color:var(--ink-3)">导入于</span><span style="font-size:12px" id="sheet-import"></span></div>
          <div class="list-row"><span style="font-size:12px;color:var(--ink-3)">来源</span><span style="font-size:12px">游戏导出</span></div>
          <div class="list-row"><span style="font-size:12px;color:var(--ink-3)">加速影响</span><span style="font-size:12px;color:var(--warn)">可能更早完成</span></div>
        </div>
        <div class="sheet-actions">
          <button class="btn btn-secondary" data-action="close-sheet">静音此条</button>
          <button class="btn btn-primary" data-action="close-sheet">复制完成时刻</button>
        </div>
      </div>
    `;
  }

  // —— app root ——
  const root = $("#app");
  const layer = $("#layer");

  function render() {
    let html = "";
    if (state.tab === "notify") html = screenNotify();
    else if (state.tab === "timer") html = screenTimer();
    else if (state.tab === "progress") html = screenProgress();
    else if (state.tab === "events") html = screenEvents();
    else html = screenSettings();
    root.innerHTML = html + renderImportModal() + renderSheet();
    bind();
  }

  function toast(msg) {
    let el = $("#toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function openImport() {
    const m = $("#import-modal");
    if (m) {
      m.classList.add("open");
      m.setAttribute("aria-hidden", "false");
    }
  }
  function closeImport() {
    const m = $("#import-modal");
    if (m) {
      m.classList.remove("open");
      m.setAttribute("aria-hidden", "true");
    }
    const err = $("#import-error");
    if (err) err.style.display = "none";
    const prev = $("#preview-card");
    if (prev) prev.style.display = "none";
    const btn = $("#import-confirm");
    if (btn) btn.disabled = true;
  }

  function openSheet(jobId) {
    const job = state.snapshot?.jobs?.find((j) => j.id === jobId);
    if (!job) return;
    state.sheetJobId = jobId;
    const remain = Math.max(0, job.finishAt - Date.now());
    $("#sheet-name").textContent = job.name;
    $("#sheet-levels").textContent =
      job.currentLevel != null ? `${job.currentLevel} → ${job.targetLevel}` : "进行中";
    $("#sheet-badge").textContent = job.lane === "lab" ? "实验室" : "建筑工";
    $("#sheet-time").textContent = remain > 0 ? formatDuration(remain) : "已完成";
    $("#sheet-abs").textContent = `预计完成 ${formatAbs(job.finishAt)}`;
    $("#sheet-import").textContent = `今天 ${formatAbs(job.importedAt).split(" ")[1] || ""}`;
    const total = Math.max(job.remainingSecAtImport * 1000, 1);
    const pct = Math.min(100, Math.max(0, ((total - remain) / total) * 100));
    $("#sheet-progress").style.width = `${pct}%`;
    $("#sheet-overlay").classList.add("open");
    $("#job-sheet").classList.add("open");
  }
  function closeSheet() {
    $("#sheet-overlay")?.classList.remove("open");
    $("#job-sheet")?.classList.remove("open");
    state.sheetJobId = null;
  }

  function parseAndPreview() {
    const area = $("#paste-area");
    const err = $("#import-error");
    const prev = $("#preview-card");
    const btn = $("#import-confirm");
    const text = area?.value?.trim() || "";
    if (!text) {
      btn.disabled = true;
      prev.style.display = "none";
      err.style.display = "none";
      return;
    }
    const result = parseVillage(text);
    if (!result.ok) {
      err.textContent = result.error;
      err.style.display = "block";
      prev.style.display = "none";
      btn.disabled = true;
      return;
    }
    err.style.display = "none";
    const s = result.snapshot;
    prev.style.display = "flex";
    $("#preview-badge").textContent = "可导入";
    $("#preview-stats").innerHTML = `
      <div class="card stat-mini" style="flex:1;padding:8px;text-align:center;background:var(--card-2)"><div class="v" style="color:var(--gold);font-size:18px">${s.jobs.length}</div><div class="s">进行中</div></div>
      <div class="card stat-mini" style="flex:1;padding:8px;text-align:center;background:var(--card-2)"><div class="v" style="font-size:18px">${s.buildingCount || "—"}</div><div class="s">建筑</div></div>
      <div class="card stat-mini" style="flex:1;padding:8px;text-align:center;background:var(--card-2)"><div class="v" style="color:var(--warn);font-size:18px">${s.warnings.length}</div><div class="s">警告</div></div>
    `;
    $("#preview-warn").innerHTML = s.warnings.map((w) => `· ${w}`).join("<br/>") || "· 无警告";
    btn.disabled = false;
    btn.textContent = "确认导入 · 覆盖当前数据";
  }

  function confirmImport() {
    const text = $("#paste-area")?.value?.trim() || "";
    const result = parseVillage(text);
    if (!result.ok) return;
    state.snapshot = result.snapshot;
    save();
    closeImport();
    state.tab = "timer";
    render();
    toast(`已导入 · ${result.snapshot.jobs.length} 项进行中`);
  }

  function bind() {
    $$("[data-tab]").forEach((el) =>
      el.addEventListener("click", () => {
        state.tab = el.dataset.tab;
        render();
      })
    );
    $$("[data-action]").forEach((el) =>
      el.addEventListener("click", async (e) => {
        const action = el.dataset.action;
        if (action === "open-import") {
          openImport();
        } else if (action === "close-import") {
          closeImport();
        } else if (action === "load-sample") {
          state.snapshot = sampleSnapshot();
          save();
          state.tab = "timer";
          render();
          toast("已加载示例数据");
        } else if (action === "load-sample-paste") {
          const area = $("#paste-area");
          area.value = JSON.stringify({
            buildings: [
              { data: 1000001, lvl: 11, cnt: 1, timer: 2 * 86400 + 3 * 3600 + 15 * 60 },
              { data: 1000010, lvl: 10, cnt: 1, timer: 4 * 60 + 45 },
              { data: 1200001, lvl: 16, cnt: 4, timer: 0 },
            ],
            units: [{ data: 1, name: "野蛮人", lvl: 12, timer: 5 * 3600 + 22 * 60 }],
            heroes: [{ data: 1, name: "野蛮人女王", lvl: 85, max: 95 }],
            boosts: { builder_boost: 0 },
          });
          parseAndPreview();
        } else if (action === "confirm-import") {
          confirmImport();
        } else if (action === "paste-clip") {
          try {
            const text = await navigator.clipboard.readText();
            if (text) {
              $("#paste-area").value = text;
              parseAndPreview();
            } else toast("剪贴板为空");
          } catch {
            toast("无法读取剪贴板，请手动粘贴");
          }
        } else if (action === "show-help") {
          toast("游戏 → 设置 → 更多设置 → Data Export → Copy");
        } else if (action === "close-sheet") {
          closeSheet();
        } else if (action === "go-settings") {
          state.tab = "settings";
          render();
        } else if (action === "go-notify") {
          state.tab = "notify";
          render();
        } else if (action === "back-settings") {
          state.tab = "settings";
          render();
        } else if (action === "clear-data") {
          if (confirm("确定清除本地村庄数据？此操作不可恢复。")) {
            state.snapshot = null;
            save();
            state.tab = "timer";
            render();
            toast("本地数据已清除");
          }
        } else if (action === "export-data") {
          const blob = new Blob([JSON.stringify({ snapshot: state.snapshot, settings: state.settings }, null, 2)], {
            type: "application/json",
          });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "gongtou-backup.json";
          a.click();
          toast("已导出备份 JSON");
        } else if (action === "request-notify") {
          if ("Notification" in window) {
            Notification.requestPermission().then((p) => {
              toast(p === "granted" ? "通知已开启" : "仍为未开启，可在系统设置中打开");
            });
          } else {
            toast("当前环境不支持系统通知");
          }
        } else if (action === "event-detail") {
          toast("事件详情 · 以游戏内为准");
        }
      })
    );

    $$("[data-job]").forEach((el) =>
      el.addEventListener("click", () => openSheet(el.dataset.job))
    );

    $$("[data-toggle]").forEach((el) =>
      el.addEventListener("click", () => {
        const key = el.dataset.toggle;
        state.settings[key] = !state.settings[key];
        save();
        render();
      })
    );
    $$("[data-lead]").forEach((el) =>
      el.addEventListener("click", () => {
        state.settings.leadMinutes = Number(el.dataset.lead);
        save();
        render();
      })
    );
    $$("[data-pfilter]").forEach((el) =>
      el.addEventListener("click", () => {
        state.progressFilter = el.dataset.pfilter;
        render();
      })
    );
    $$("[data-ptab]").forEach((el) =>
      el.addEventListener("click", () => {
        state.progressTab = el.dataset.ptab;
        render();
      })
    );

    const area = $("#paste-area");
    if (area) area.addEventListener("input", debounce(parseAndPreview, 200));
  }

  function debounce(fn, ms) {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  }

  // live tick
  setInterval(() => {
    if (state.tab !== "timer" && state.tab !== "events" && state.tab !== "notify") return;
    const ov = $("#ov-big");
    if (ov && state.snapshot) {
      const earliest = [...(state.snapshot.jobs || [])]
        .filter((j) => j.finishAt > Date.now())
        .sort((a, b) => a.finishAt - b.finishAt)[0];
      if (earliest) ov.textContent = formatClock(earliest.finishAt - Date.now());
    }
    const evT = $("#event-time");
    if (evT) {
      const events = nextEvents();
      const next = events.find((e) => !e.ongoing && e.start > Date.now()) || events[0];
      if (next) {
        evT.textContent = next.ongoing
          ? "进行中"
          : formatDuration(Math.max(0, next.start - Date.now()));
      }
    }
    if (state.sheetJobId) {
      const job = state.snapshot?.jobs?.find((j) => j.id === state.sheetJobId);
      if (job) {
        const remain = Math.max(0, job.finishAt - Date.now());
        const t = $("#sheet-time");
        if (t) t.textContent = remain > 0 ? formatDuration(remain) : "已完成";
      }
    }
  }, 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) render();
  });

  load();
  render();
})();
