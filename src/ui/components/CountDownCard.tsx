import { formatAbs, formatDuration } from "@/domain/time";
import type { UpgradeJob } from "@/domain/types";
import { Badge, ProgressTrack } from "./Ui";
import s from "./CountDownCard.module.css";

export function CountDownCard({
  job,
  onOpen,
  now,
}: {
  job: UpgradeJob;
  onOpen: (id: string) => void;
  now: number;
}) {
  const remain = job.finishAt - now;
  const done = remain <= 0;
  const almost = !done && remain <= 5 * 60 * 1000;
  const total = Math.max(job.remainingSecAtImport * 1000, 1);
  const pct = Math.min(100, Math.max(0, ((total - remain) / total) * 100));
  const tone = done ? "ok" : almost ? "warn" : job.lane === "lab" ? "lab" : "gold";
  const levels =
    job.currentLevel != null
      ? `${job.currentLevel} → ${job.targetLevel}`
      : job.lane === "lab"
        ? "研究"
        : "进行中";

  return (
    <button
      type="button"
      className={`${s.card} ${done ? s.done : ""} ${almost ? s.almost : ""}`}
      onClick={() => onOpen(job.id)}
    >
      <div className={s.head}>
        <div className={s.title}>
          <span className={`${s.stripe} ${s[tone]}`} />
          <span>{job.name}</span>
        </div>
        {done ? (
          <Badge tone="ok">已完成</Badge>
        ) : almost ? (
          <Badge tone="warn">即将完成</Badge>
        ) : job.lane === "lab" ? (
          <Badge tone="lab">研究中</Badge>
        ) : job.lane === "goblin" ? (
          <Badge tone="warn">哥布林工</Badge>
        ) : (
          <Badge tone="gold">升级中</Badge>
        )}
      </div>
      <div className={s.meta}>
        <span>{levels}</span>
        <span className={s.finish}>完成 {formatAbs(job.finishAt)}</span>
      </div>
      <div className={`${s.time} ${s[tone]}`}>
        {done ? "已完成" : formatDuration(remain)}
      </div>
      <ProgressTrack value={pct} tone={tone} />
    </button>
  );
}
