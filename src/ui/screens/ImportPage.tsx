import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Content, TopBar, shellStyles } from "@/ui/components/AppShell";
import { Badge, Btn } from "@/ui/components/Ui";
import { parseVillage, samplePasteJson, sampleSnapshot } from "@/domain/village";
import { useAppStore } from "@/app/store";
import s from "./ImportPage.module.css";

export function ImportPage() {
  const navigate = useNavigate();
  const setSnapshot = useAppStore((st) => st.setSnapshot);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const t = text.trim();
    if (!t) return null;
    const result = parseVillage(t);
    if (!result.ok) return result;
    return result;
  }, [text]);

  const confirm = () => {
    if (!preview || !preview.ok) return;
    setSnapshot(preview.snapshot);
    navigate("/");
  };

  return (
    <>
      <TopBar
        title="导入村庄数据"
        left={
          <button
            type="button"
            className={shellStyles.iconBtn}
            aria-label="关闭"
            onClick={() => navigate(-1)}
          >
            <svg viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        }
        right={
          <button
            type="button"
            className={s.help}
            onClick={() => window.alert("游戏 → 设置 → 更多设置 → Data Export → Copy")}
          >
            帮助
          </button>
        }
      />
      <Content>
        <section className={s.guide}>
          <strong style={{ fontSize: 14 }}>怎么复制？</strong>
          <div className={s.guideBody}>
            游戏 → 设置 → 更多设置 → Data Export → Copy。导出是快照，升级后重新复制即可。
          </div>
          <button type="button" className={s.linkBtn}>
            打开游戏设置
          </button>
        </section>

        <label className={s.label} htmlFor="paste-area">
          粘贴 Data Export 内容
        </label>
        <textarea
          id="paste-area"
          className={s.textarea}
          placeholder="buildings / units / spells / heroes …（等待粘贴）"
          spellCheck={false}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <Btn
            variant="secondary"
            className={s.smallBtn}
            onClick={async () => {
              try {
                const clip = await navigator.clipboard.readText();
                if (clip) setText(clip);
                else window.alert("剪贴板为空");
              } catch {
                window.alert("无法读取剪贴板，请手动粘贴");
              }
            }}
          >
            从剪贴板粘贴
          </Btn>
          <Btn variant="secondary" className={s.smallBtn} onClick={() => setText(samplePasteJson())}>
            填入示例
          </Btn>
        </div>

        {preview && !preview.ok ? (
          <div className={s.error}>{preview.error}</div>
        ) : null}
        {error ? <div className={s.error}>{error}</div> : null}

        {preview?.ok ? (
          <section className={s.preview}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 14 }}>解析预览</strong>
              <Badge tone="ok">可导入</Badge>
            </div>
            <div className={s.stats}>
              <div className={s.stat}>
                <div className={s.statV} style={{ color: "var(--gold)" }}>
                  {preview.snapshot.jobs.length}
                </div>
                <div className={s.statL}>进行中</div>
              </div>
              <div className={s.stat}>
                <div className={s.statV}>{preview.snapshot.buildingCount || "—"}</div>
                <div className={s.statL}>建筑</div>
              </div>
              <div className={s.stat}>
                <div className={s.statV} style={{ color: "var(--warn)" }}>
                  {preview.snapshot.warnings.length}
                </div>
                <div className={s.statL}>警告</div>
              </div>
            </div>
            <div className={s.warn}>
              {preview.snapshot.warnings.map((w) => `· ${w}`).join("\n") || "· 无警告"}
            </div>
          </section>
        ) : null}

        <div style={{ flex: 1 }} />
        <Btn onClick={confirm} disabled={!preview?.ok}>
          确认导入 · 覆盖当前数据
        </Btn>
        <p className={shellStyles.footerNote}>每次导入会重算全部倒计时</p>
        <Btn
          variant="ghost"
          onClick={() => {
            setSnapshot(sampleSnapshot());
            navigate("/");
          }}
        >
          直接使用示例数据
        </Btn>
      </Content>
    </>
  );
}
