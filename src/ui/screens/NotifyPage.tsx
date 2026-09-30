import { useNavigate } from "react-router-dom";
import { Content, TopBar, shellStyles } from "@/ui/components/AppShell";
import { Badge, Btn, Switch } from "@/ui/components/Ui";
import { useAppStore } from "@/app/store";
import { useNotifyScheduler } from "@/ui/hooks/useNotifyScheduler";
import s from "./NotifyPage.module.css";

export function NotifyPage() {
  const navigate = useNavigate();
  const settings = useAppStore((st) => st.settings);
  const setSettings = useAppStore((st) => st.setSettings);
  const queue = useNotifyScheduler();

  return (
    <>
      <TopBar
        title="通知设置"
        left={
          <button
            type="button"
            className={shellStyles.iconBtn}
            aria-label="返回"
            onClick={() => navigate("/settings")}
          >
            <svg viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        }
      />
      <Content>
        <section className={s.perm}>
          <div className={s.permTitle}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7M10 21a2 2 0 0 0 4 0" />
            </svg>
            系统通知未开启
          </div>
          <div className={s.permSub}>倒计时仍可用。开启后升级完成才能提醒你。</div>
          <Btn
            onClick={() => {
              if ("Notification" in window) {
                void Notification.requestPermission();
              }
            }}
          >
            去开启通知
          </Btn>
        </section>

        <div className={s.queueBar}>
          <span style={{ fontSize: 12, color: "var(--ink-2)" }}>
            待发提醒 {queue.length} 条 · 按 finishAt 本地排程
          </span>
          <Badge tone="gold">7 天窗口</Badge>
        </div>

        <div className={shellStyles.sectionLabel}>提前提醒</div>
        <div className={s.segmented}>
          {[
            [0, "关"],
            [5, "5 分"],
            [15, "15 分"],
            [60, "1 小时"],
          ].map(([v, label]) => (
            <button
              key={v}
              type="button"
              className={settings.leadMinutes === v ? s.segActive : ""}
              onClick={() => setSettings({ leadMinutes: v as number })}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={shellStyles.sectionLabel}>通知类型</div>
        <div className={s.list}>
          {(
            [
              ["notifyBuilder", "建筑工完成", "到点提醒"],
              ["notifyLab", "实验室完成", "到点提醒"],
              ["notifyOther", "其他进行中", "哥布林/助手"],
              ["notifyEvent", "公开事件", "赛季等"],
              ["quietEnabled", "免打扰 23:00–07:00", "完全静音"],
            ] as const
          ).map(([key, title, sub]) => (
            <div key={key} className={s.row}>
              <div>
                <div className={s.name}>{title}</div>
                <div className={s.sub}>{sub}</div>
              </div>
              <Switch
                label={title}
                on={settings[key]}
                onToggle={() => setSettings({ [key]: !settings[key] })}
              />
            </div>
          ))}
        </div>

        <div className={shellStyles.sectionLabel}>更多</div>
        <div className={s.list}>
          <div className={s.row}>
            <div className={s.name}>通知历史 · 最近 7 天</div>
            <div className={s.chev}>›</div>
          </div>
          <div className={s.row}>
            <div className={s.name}>导出 ICS 日历</div>
            <div className={s.chev}>›</div>
          </div>
          <div className={s.row}>
            <div className={s.name}>单条升级静音管理</div>
            <div className={s.chev}>›</div>
          </div>
        </div>
        <p className={shellStyles.footerNote}>提醒可能因系统省电策略略有延迟。</p>
      </Content>
    </>
  );
}
