import { Content, TopBar, shellStyles } from "@/ui/components/AppShell";
import { ProgressTrack } from "@/ui/components/Ui";
import { useAppStore } from "@/app/store";
import { defaultHeroes, defaultUnits } from "@/domain/village";
import s from "./ProgressPage.module.css";

export function ProgressPage() {
  const snapshot = useAppStore((st) => st.snapshot);
  const progressFilter = useAppStore((st) => st.progressFilter);
  const setProgressFilter = useAppStore((st) => st.setProgressFilter);
  const progressTab = useAppStore((st) => st.progressTab);
  const setProgressTab = useAppStore((st) => st.setProgressTab);

  const p = snapshot?.progress ?? {
    buildingPct: 78,
    wallPct: 62,
    leftItems: 23,
    heroes: defaultHeroes(),
    units: defaultUnits(),
  };

  const heroes = p.heroes.filter((h) =>
    progressFilter === "unmet" ? h.level < h.maxLevel : true,
  );

  return (
    <>
      <TopBar title="成长进度" />
      <Content>
        <section className={s.card}>
          <div className={s.statBig}>
            <span className={s.statLabel}>建筑完成度</span>
            <span className={s.pct}>{p.buildingPct}%</span>
          </div>
          <ProgressTrack value={p.buildingPct} />
          <div className={s.statFoot}>
            <span>城墙 15×40 · 16×30</span>
            <span>TH16 口径</span>
          </div>
        </section>
        <div className={s.grid}>
          <div className={s.mini}>
            <div className={s.miniLabel}>还剩满本</div>
            <div className={s.miniVal}>{p.leftItems} 项</div>
            <div className={s.miniSub}>串行约 86 天</div>
          </div>
          <div className={s.mini}>
            <div className={s.miniLabel}>城墙</div>
            <div className={s.miniVal}>{p.wallPct}%</div>
            <div className={s.miniSub}>还剩 38 段</div>
          </div>
        </div>
        <div className={s.segmented}>
          {[
            ["hero", "英雄"],
            ["unit", "兵种"],
            ["spell", "法术"],
            ["pet", "战宠"],
            ["eq", "装备"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={progressTab === id ? s.segActive : ""}
              onClick={() => setProgressTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={s.chips}>
          {[
            ["all", "全部"],
            ["unmet", "仅未满"],
            ["upgrading", "升级中"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`${s.chip} ${progressFilter === id ? s.chipActive : ""}`}
              onClick={() => setProgressFilter(id as "all" | "unmet" | "upgrading")}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={s.list}>
          {heroes.map((h) => {
            const pct = Math.round((h.level / h.maxLevel) * 100);
            const met = h.level >= h.maxLevel;
            return (
              <div key={h.name} className={s.heroRow}>
                <div className={s.nr}>
                  <span className={s.nm}>{h.name}</span>
                  <span className={s.rt} style={{ color: met ? "var(--ok)" : "var(--danger)" }}>
                    {met ? "已满" : `差 ${h.maxLevel - h.level} 级`}
                  </span>
                </div>
                <div className={s.bar}>
                  <i className={met ? s.barOk : ""} style={{ width: `${pct}%` }} />
                </div>
                <div className={s.lvl}>
                  {h.level}/{h.maxLevel}
                </div>
              </div>
            );
          })}
          {!heroes.length && <div className={s.heroRow}>没有符合条件的单位</div>}
        </div>
        <p className={shellStyles.footerNote}>
          完成度按当前大本营可达成满级计算；城墙单独统计。
        </p>
      </Content>
    </>
  );
}
