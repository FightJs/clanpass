import type { ButtonHTMLAttributes, ReactNode } from "react";
import s from "./Ui.module.css";

export function Btn({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const v = variant === "danger" ? "btnDanger" : variant;
  return (
    <button type="button" className={`${s.btn} ${s[v]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Badge({
  tone = "gold",
  children,
}: {
  tone?: "gold" | "lab" | "ok" | "warn" | "event" | "danger";
  children: ReactNode;
}) {
  return <span className={`${s.badge} ${s[tone]}`}>{children}</span>;
}

export function Switch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`${s.switch} ${on ? s.switchOn : ""}`}
      onClick={onToggle}
    >
      <span className={s.knob} />
    </button>
  );
}

export function ListRow({
  title,
  sub,
  right,
  danger,
  onClick,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  danger?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className={s.rowLeft}>
        <div>
          <div className={`${s.rowName} ${danger ? s.danger : ""}`}>{title}</div>
          {sub ? <div className={s.rowSub}>{sub}</div> : null}
        </div>
      </div>
      <div className={s.rowRight}>{right}</div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={s.listRow} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className={s.listRow}>{inner}</div>;
}

export function ProgressTrack({
  value,
  tone = "gold",
}: {
  value: number;
  tone?: "gold" | "lab" | "ok" | "warn" | "event";
}) {
  return (
    <div className={s.track}>
      <div className={`${s.fill} ${s[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
