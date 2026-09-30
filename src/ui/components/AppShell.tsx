import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import s from "./AppShell.module.css";

function StatusIcons() {
  return (
    <div className={s.statusIcons} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M2 20h3v-6H2v6zm5 0h3V8H7v12zm5 0h3V4h-3v16zm5 0h3v-9h-3v9z" />
      </svg>
      <svg viewBox="0 0 24 24">
        <path
          d="M5 12.5a9 9 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M2 9a15 15 0 0 1 20 0"
          fill="none"
          stroke="#E8ECF4"
          strokeWidth="1.8"
        />
      </svg>
      <svg viewBox="0 0 24 24">
        <rect
          x="2"
          y="7"
          width="18"
          height="10"
          rx="2"
          fill="none"
          stroke="#E8ECF4"
          strokeWidth="1.8"
        />
        <path d="M22 10v4" stroke="#E8ECF4" strokeWidth="1.8" />
        <rect x="4" y="9" width="12" height="6" rx="1" />
      </svg>
    </div>
  );
}

export function StatusBar() {
  return (
    <div className={s.statusBar}>
      <span>9:41</span>
      <StatusIcons />
    </div>
  );
}

export function TopBar({
  title,
  left,
  right,
}: {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className={s.topBar}>
      <div className={s.side}>{left}</div>
      <div className={s.title}>{title}</div>
      <div className={`${s.side} ${s.sideRight}`}>{right}</div>
    </header>
  );
}

export function SectionLabel({
  children,
  right,
  tone,
}: {
  children: ReactNode;
  right?: ReactNode;
  tone?: "lab" | "event";
}) {
  return (
    <div className={`${s.sectionLabel} ${tone ? s[tone] : ""}`}>
      <span>{children}</span>
      {right ? <span className={s.right}>{right}</span> : null}
    </div>
  );
}

const TABS = [
  { to: "/", label: "倒计时", tone: "gold", end: true },
  { to: "/progress", label: "进度", tone: "gold", end: false },
  { to: "/events", label: "事件", tone: "blue", end: false },
  { to: "/settings", label: "设置", tone: "gold", end: false },
] as const;

function TabIcon({ label }: { label: string }) {
  if (label === "倒计时")
    return (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5M9 2h6" />
      </svg>
    );
  if (label === "进度")
    return (
      <svg viewBox="0 0 24 24">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    );
  if (label === "事件")
    return (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function TabBar() {
  return (
    <nav className={s.tabDock} role="tablist">
      <div className={s.tabBar}>
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `${s.tabItem} ${s[t.tone]} ${isActive ? s.active : ""}`
            }
            role="tab"
          >
            <TabIcon label={t.label} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  return (
    <div className={s.shell}>
      <StatusBar />
      <Outlet />
      <TabBar />
      <button type="button" hidden onClick={() => navigate("/import")} />
    </div>
  );
}

export function Content({
  children,
  center,
}: {
  children: ReactNode;
  center?: boolean;
}) {
  return <main className={`${s.content} ${center ? s.contentCenter : ""}`}>{children}</main>;
}

export { s as shellStyles };
