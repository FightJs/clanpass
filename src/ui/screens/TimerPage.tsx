import { Content, SectionLabel, TopBar, shellStyles } from "@/ui/components/AppShell";
import { Btn, Badge } from "@/ui/components/Ui";
import { CountDownCard } from "@/ui/components/CountDownCard";
import { formatAbs, formatClock, formatDuration, relImported } from "@/domain/time";
import { useAppStore } from "@/app/store";
import { sampleSnapshot } from "@/domain/village";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import s from "./TimerPage.module.css";

export function EmptyState() {
  const setSnapshot = useAppStore((st) => st.setSnapshot);
  const navigate = useNavigate();
  return (
    <>
      <TopBar title="工头" />
      <Content center>
        <div className={s.heroArt}>
          <div className={s.circle}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 2.5M9 2h6" />
            </svg>
          </div>
        </div>
        <h1 className={s.emptyTitle}>工人还剩多久 · 到点叫你</h1>
        <p className={s.emptySub}>
          粘贴游戏内村庄导出，自动算出建筑工与实验室倒计时。
        </p>
        <div className={s.steps}>
          <div className={s.step}>
            <span className={s.num}>1</span>游戏 → 设置 → 更多设置
          </div>
          <div className={s.step}>
            <span className={s.num}>2</span>Data Export → Copy
          </div>
          <div className={s.step}>
            <span className={s.num}>3</span>粘贴到工头，看到倒计时
          </div>
        </div>
        <div className={s.cta}>
          <Btn onClick={() => navigate("/import")}>粘贴村庄数据</Btn>
          <Btn
            variant="ghost"
            onClick={() => {
              setSnapshot(sampleSnapshot());
            }}
          >
            用示例数据看看
          </Btn>
        </div>
        <p className={shellStyles.footerNote}>非官方粉丝工具 · 数据仅存本机</p>
      </Content>
    </>
  );
}

export function TimerPage() {
  const snapshot = useAppStore((st) => st.snapshot);
  const setSnapshot = useAppStore((st) => st.setSnapshot);
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (!snapshot) return <EmptyState />;

  const jobs = snapshot.jobs;
  const builders = [...jobs]
    .filter((j) => j.lane !== "lab")
    .sort((a, b) => a.finishAt - b.finishAt);
  const lab = jobs.find((j) => j.lane === "lab");
  const earliest = [...jobs]
    .filter((j) => j.finishAt > now)
    .sort((a, b) => a.finishAt - b.finishAt)[0];
  const doneCount = jobs.filter((j) => j.finishAt <= now).length;

  return (
    <>
      <TopBar
        title="倒计时"
        left={<span className={s.village}>主号 ⌄</span>}
        right={
          <>
            <button
              type="button"
              className={shellStyles.iconBtn}
              aria-label="载入示例"
              onClick={() => setSnapshot(sampleSnapshot())}
            >
              <svg viewBox="0 0 24 24">
                <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" />
              </svg>
            </button>
            <button
              type="button"
              className={shellStyles.iconBtn}
              aria-label="导入"
              onClick={() => navigate("/import")}
            >
              <svg viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
          </>
        }
      />
      <div className={shellStyles.snapshot}>
        <span>更新于 {relImported(snapshot.importedAt)} · 快照</span>
        <button
          type="button"
          className={shellStyles.snapshotAct}
          onClick={() => navigate("/import")}
        >
          重新导入
        </button>
      </div>
      <Content>
        <section className={s.overview} aria-live="polite">
          <div className={s.ovTop}>
            <span className={s.ovLabel}>最早完成</span>
            <Badge tone="gold">{jobs.length} 项</Badge>
          </div>
          <div className={s.ovBot}>
            <div>
              <div className={s.ovBig}>
                {earliest ? formatClock(earliest.finishAt - now) : "--:--:--"}
              </div>
              <div className={s.ovWho}>
                {earliest
                  ? `${earliest.name} · ${earliest.currentLevel ?? ""}${earliest.targetLevel ? "→" + earliest.targetLevel : ""}`
                  : "暂无进行中升级"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className={s.ovLabLabel}>实验室</div>
              <div className={s.ovLabVal}>
                {lab
                  ? `${lab.name} ${formatDuration(Math.max(0, lab.finishAt - now))}`
                  : "空闲"}
              </div>
            </div>
          </div>
        </section>

        <SectionLabel
          right={`${builders.filter((j) => j.finishAt > now).length} 进行 · ${doneCount} 完成`}
        >
          建筑工
        </SectionLabel>
        <div className={s.cards}>
          {builders.slice(0, 3).map((job) => (
            <CountDownCard
              key={job.id}
              job={job}
              now={now}
              onOpen={(id) => navigate(`/job/${encodeURIComponent(id)}`)}
            />
          ))}
          {!builders.length && (
            <div className={s.emptyBox}>没有进行中的建筑升级</div>
          )}
        </div>

        <SectionLabel tone="lab" right="研究中">
          实验室
        </SectionLabel>
        {lab ? (
          <button
            type="button"
            className={s.labRow}
            onClick={() => navigate(`/job/${encodeURIComponent(lab.id)}`)}
          >
            <span className={s.labStripe} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={s.labTitle}>
                {lab.name} {lab.currentLevel != null ? `${lab.currentLevel}→${lab.targetLevel}` : ""}{" "}
                · 研究
              </div>
              <div className={s.labSub}>完成 {formatAbs(lab.finishAt)}</div>
            </div>
            <div className={s.labTime}>
              {lab.finishAt > now ? formatDuration(lab.finishAt - now) : "已完成"}
            </div>
          </button>
        ) : (
          <div className={s.labRow} style={{ opacity: 0.7 }}>
            <span className={s.labStripe} />
            <div style={{ fontSize: 13, color: "var(--ink-2)" }}>实验室空闲</div>
          </div>
        )}

        <div className={s.hintStrip}>
          <span className={s.hintA}>
            {doneCount ? `${doneCount} 项可能已完成` : "1 名工人可能空闲"}
          </span>
          <span className={s.hintB}>哥布林 · 夜世界 · 药水</span>
        </div>
        <p className={shellStyles.footerNote}>
          * 加速可能导致游戏内实际完成更早。数据仅存本机。
        </p>
      </Content>
    </>
  );
}
