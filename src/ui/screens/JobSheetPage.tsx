import { useNavigate, useParams } from "react-router-dom";
import { Btn, ProgressTrack } from "@/ui/components/Ui";
import { formatAbs, formatDuration } from "@/domain/time";
import { useAppStore } from "@/app/store";
import s from "./JobSheetPage.module.css";

export function JobSheetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const job = useAppStore((st) => st.snapshot?.jobs.find((j) => j.id === id));

  if (!job) {
    return (
      <div className={s.wrap}>
        <div className={s.sheet}>
          <div className={s.handle} />
          <div style={{ fontSize: 18, fontWeight: 700 }}>未找到该升级任务</div>
          <Btn onClick={() => navigate("/")}>返回倒计时</Btn>
        </div>
      </div>
    );
  }

  const remain = Math.max(0, job.finishAt - Date.now());
  const total = Math.max(job.remainingSecAtImport * 1000, 1);
  const pct = Math.min(100, Math.max(0, ((total - remain) / total) * 100));

  return (
    <div className={s.wrap} onClick={() => navigate(-1)}>
      <div className={s.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={s.handle} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className={s.name}>{job.name}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <span className={s.levels}>
                {job.currentLevel != null
                  ? `${job.currentLevel} → ${job.targetLevel}`
                  : "进行中"}
              </span>
              <span className={s.badge}>{job.lane === "lab" ? "实验室" : "建筑工"}</span>
            </div>
          </div>
          <button type="button" className={s.close} onClick={() => navigate(-1)} aria-label="关闭">
            ✕
          </button>
        </div>
        <div className={s.timeBox}>
          <div className={s.time}>{remain > 0 ? formatDuration(remain) : "已完成"}</div>
          <div className={s.abs}>预计完成 {formatAbs(job.finishAt)}</div>
          <div style={{ width: "100%" }}>
            <ProgressTrack value={pct} />
          </div>
        </div>
        <div className={s.meta}>
          <div>
            <span>导入于</span>
            <span>{formatAbs(job.importedAt)}</span>
          </div>
          <div>
            <span>来源</span>
            <span>游戏导出</span>
          </div>
          <div>
            <span>加速影响</span>
            <span style={{ color: "var(--warn)" }}>可能更早完成</span>
          </div>
        </div>
        <div className={s.actions}>
          <Btn variant="secondary" onClick={() => navigate(-1)}>
            静音此条
          </Btn>
          <Btn onClick={() => navigate(-1)}>复制完成时刻</Btn>
        </div>
      </div>
    </div>
  );
}
