import { useEffect, useState } from "react";
import { Content, SectionLabel, TopBar, shellStyles } from "@/ui/components/AppShell";
import { Badge } from "@/ui/components/Ui";
import { nextEvents, type CalendarEvent } from "@/domain/events";
import { formatDuration } from "@/domain/time";
import s from "./EventsPage.module.css";

function EventRow({ e, ongoing }: { e: CalendarEvent; ongoing?: boolean }) {
  return (
    <button type="button" className={`${s.row} ${ongoing ? s.ongoing : ""}`}>
      <span
        className={s.dot}
        style={{
          background: `var(--${e.type === "ink" ? "ink-2" : e.type})`,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={s.rowName}>{e.name}</div>
        <div
          className={s.rowSub}
          style={{ color: ongoing ? "var(--warn)" : "var(--ink-2)" }}
        >
          {ongoing ? `进行中 · ${formatDuration(e.end - Date.now())}` : e.desc}
        </div>
      </div>
      <span className={s.tip}>{e.tip}</span>
    </button>
  );
}

export function EventsPage() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const events = nextEvents(new Date(now));
  const next =
    events.find((e) => !e.ongoing && e.start > now) || events[0];
  const ongoing = events.filter((e) => e.ongoing);
  const upcoming = events.filter((e) => !e.ongoing).slice(0, 4);

  return (
    <>
      <TopBar
        title="事件日历"
        right={
          <button type="button" className={shellStyles.iconBtn} aria-label="通知">
            <svg viewBox="0 0 24 24">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7M10 21a2 2 0 0 0 4 0" />
            </svg>
          </button>
        }
      />
      <Content>
        <section className={s.hero}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className={s.heroLabel}>下一个事件</span>
            <Badge tone="event">周期活动</Badge>
          </div>
          <div className={s.heroName}>{next.name}</div>
          <div className={s.heroTime}>
            {next.ongoing ? "进行中" : formatDuration(Math.max(0, next.start - now))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className={s.heroDesc}>{next.desc}</span>
            <span className={s.heroAdv}>领奖别错过 →</span>
          </div>
        </section>

        <SectionLabel>进行中</SectionLabel>
        {ongoing.length ? (
          ongoing.map((e) => <EventRow key={e.id} e={e} ongoing />)
        ) : (
          <div className={s.empty}>当前没有进行中的活动</div>
        )}

        <SectionLabel>即将发生</SectionLabel>
        {upcoming.map((e) => (
          <EventRow key={e.id} e={e} />
        ))}

        <button type="button" className={s.collapsed}>
          <span>已结束 · 2</span>
          <span style={{ color: "var(--ink-3)" }}>⌄</span>
        </button>
        <p className={shellStyles.footerNote}>
          事件时间按 UTC 周期推算并转本地时区，以游戏内为准。
        </p>
      </Content>
    </>
  );
}
