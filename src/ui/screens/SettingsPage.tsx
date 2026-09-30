import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Content, TopBar, shellStyles } from "@/ui/components/AppShell";
import { useAppStore } from "@/app/store";
import { relImported } from "@/domain/time";
import s from "./SettingsPage.module.css";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <div className={shellStyles.sectionLabel}>{title}</div>
      <div className={s.list}>{children}</div>
    </>
  );
}

function Row({
  title,
  sub,
  right,
  danger,
  onClick,
}: {
  title: string;
  sub?: string;
  right?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div>
        <div className={`${s.name} ${danger ? s.danger : ""}`}>{title}</div>
        {sub ? <div className={s.sub}>{sub}</div> : null}
      </div>
      <div className={s.right}>{right ?? "›"}</div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={s.row} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className={s.row}>{inner}</div>;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const snapshot = useAppStore((st) => st.snapshot);
  const clearData = useAppStore((st) => st.clearData);

  const exportData = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { snapshot, settings: useAppStore.getState().settings },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gongtou-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <TopBar title="设置" />
      <Content>
        <button type="button" className={s.account} onClick={() => navigate("/import")}>
          <div className={s.avatar}>主</div>
          <div style={{ flex: 1 }}>
            <div className={s.accName}>主号</div>
            <div className={s.accMeta}>
              本地村庄 · {snapshot?.jobs.length ?? 0} 项进行中
              {snapshot ? ` · ${relImported(snapshot.importedAt)}` : ""}
            </div>
          </div>
          <span style={{ color: "var(--ink-3)" }}>›</span>
        </button>

        <Group title="数据">
          <Row
            title="导入村庄数据"
            sub="粘贴导出"
            right="粘贴导出 ›"
            onClick={() => navigate("/import")}
          />
          <Row title="数据管理" sub="备份 / 清除" right="备份/清除 ›" onClick={exportData} />
          <Row title="静态库版本" sub="内置精简版" right="2026.09 ›" />
        </Group>

        <Group title="提醒">
          <Row
            title="通知设置"
            sub="权限与开关"
            right="去设置 ›"
            onClick={() => navigate("/settings/notifications")}
          />
          <Row
            title="事件偏好"
            sub="周期活动提醒"
            right="已开启 ›"
            onClick={() => navigate("/settings/notifications")}
          />
        </Group>

        <Group title="显示">
          <Row title="主题" sub="夜间工棚" right="深色 ›" />
          <Row title="语言" sub="界面语言" right="简体中文 ›" />
        </Group>

        <Group title="其他">
          <Row title="关于与合规" sub="非官方粉丝工具" />
          <Row title="反馈与建议" />
        </Group>

        <Group title="危险操作">
          <Row
            title="清除本地数据"
            danger
            onClick={() => {
              if (window.confirm("确定清除本地村庄数据？此操作不可恢复。")) {
                clearData();
              }
            }}
          />
        </Group>

        <p className={shellStyles.footerNote}>
          工头 v0.1 · 非官方粉丝工具
          <br />
          数据仅存本机 · 不隶属于 Supercell
        </p>
      </Content>
    </>
  );
}
