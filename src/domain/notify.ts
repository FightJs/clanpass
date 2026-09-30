import type { NotifySettings, UpgradeJob } from "./types";

export type NotifyKind = "complete" | "lead";

export interface NotifyItem {
  jobId: string;
  kind: NotifyKind;
  fireAt: number;
  title: string;
  body: string;
  group: "builder" | "lab" | "other" | "event";
}

function groupOf(job: UpgradeJob): NotifyItem["group"] {
  if (job.lane === "lab") return "lab";
  if (job.lane === "builder" || job.lane === "goblin") return "builder";
  return "other";
}

function groupEnabled(settings: NotifySettings, group: NotifyItem["group"]): boolean {
  if (group === "lab") return settings.notifyLab;
  if (group === "builder") return settings.notifyBuilder;
  return settings.notifyOther;
}

export function isQuietHour(ts: number, settings: NotifySettings): boolean {
  if (!settings.quietEnabled) return false;
  const d = new Date(ts);
  const h = d.getHours();
  // 23:00–07:00
  return h >= 23 || h < 7;
}

/** 免打扰：完全静音则丢弃；否则仍返回（由调用方决定延迟策略） */
export function filterQuiet(
  items: NotifyItem[],
  settings: NotifySettings,
): NotifyItem[] {
  if (!settings.quietEnabled) return items;
  return items.filter((it) => !isQuietHour(it.fireAt, settings));
}

export function buildNotifyItems(
  jobs: UpgradeJob[],
  settings: NotifySettings,
  now = Date.now(),
): NotifyItem[] {
  const items: NotifyItem[] = [];
  for (const job of jobs) {
    const group = groupOf(job);
    if (!groupEnabled(settings, group)) continue;
    const name = job.name;
    const levels =
      job.currentLevel != null
        ? `${job.currentLevel}→${job.targetLevel}`
        : "";
    const label = levels ? `${name} ${levels}` : name;

    if (job.finishAt > now) {
      items.push({
        jobId: job.id,
        kind: "complete",
        fireAt: job.finishAt,
        title: group === "lab" ? "研究完成" : "升级完成",
        body: `${label} 已完成，可以开始下一项`,
        group,
      });
    }

    const leadMs = settings.leadMinutes * 60_000;
    const leadAt = job.finishAt - leadMs;
    // 极短升级不补过长的提前量
    const jobMs = job.finishAt - job.importedAt;
    const skipLead =
      leadMs <= 0 ||
      leadAt <= now ||
      (jobMs > 0 && leadMs > jobMs && jobMs < 10 * 60_000);
    if (!skipLead) {
      items.push({
        jobId: job.id,
        kind: "lead",
        fireAt: leadAt,
        title: `还有 ${settings.leadMinutes} 分钟`,
        body: `${label} 即将完成`,
        group,
      });
    }
  }
  return filterQuiet(items, settings).sort((a, b) => a.fireAt - b.fireAt);
}

export interface ScheduleEntry {
  timerId: number;
  item: NotifyItem;
}

export type NotifyPermissionFn = () => NotificationPermission | "unsupported";

export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyPermission(): NotificationPermission | "unsupported" {
  return canNotify() ? Notification.permission : "unsupported";
}

/**
 * 浏览器本地排程：短任务 setTimeout，长任务到点窗口再补。
 * 返回清理函数。页面重新导入后应重新调用。
 */
export function scheduleLocalNotifications(
  items: NotifyItem[],
  opts?: { onFire?: (item: NotifyItem) => void; maxTimeoutMs?: number },
): () => void {
  const onFire = opts?.onFire;
  const maxTimeoutMs = opts?.maxTimeoutMs ?? 2_147_000_000;
  const timers: number[] = [];

  for (const item of items) {
    const delay = item.fireAt - Date.now();
    if (delay < 0) continue;
    const fire = () => {
      if (canNotify() && Notification.permission === "granted") {
        try {
          new Notification(item.title, {
            body: item.body,
            tag: `${item.jobId}:${item.kind}`,
          });
        } catch {
          // ignore
        }
      }
      onFire?.(item);
    };
    if (delay <= maxTimeoutMs) {
      timers.push(window.setTimeout(fire, delay));
    }
  }

  return () => {
    for (const id of timers) window.clearTimeout(id);
  };
}
