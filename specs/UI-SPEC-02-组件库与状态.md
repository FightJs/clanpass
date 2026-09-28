# UI-SPEC-02 · 组件库与状态

> 状态：Draft · 依赖：UI-SPEC-00 Token  
> 用途：实现时统一组件形态、状态与可访问性，避免每页重造

---

## 1. 组件总览

| 分类 | 组件 | 出现页 |
|---|---|---|
| 导航 | TabBar、TopBar、Sheet、Modal | 全局 |
| 展示 | CountDownCard、EventCard、StatCard、ListRow、Badge、ProgressBar | P-02～05 |
| 输入 | TextArea、Button、SegmentedControl、Switch、Chip | P-01/06 |
| 反馈 | Toast、EmptyState、ErrorBanner、Skeleton | 全局 |
| 业务 | SnapshotBar、LaneTag、BoostRow | P-02 |

---

## 2. 基础组件

### 2.1 Button

| 变体 | 样式 | 用途 |
|---|---|---|
| `primary` | 底 `--gold`，字 `#1A1200`，高 48，`r-sm` | 主 CTA |
| `secondary` | 底 `--card-2`，边 `--line-strong`，字 `--ink` | 次操作 |
| `ghost` | 无底，字 `--ink-2` | 关闭/取消 |
| `danger` | 底透明，字/边 `--danger` | 清除等 |

**状态**：`default / pressed(opacity .85) / disabled(--ink-3, 40%) / loading(左侧 spinner, 禁点)`  
**可访问**：高 ≥ 44；`aria-busy` 用于 loading。

### 2.2 Chip / 筛选

- 高 32，`r-pill`，字 `caption`
- 选中：底 `--gold-weak`，字 `--gold`，边金
- 未选中：底透明，边 `--line-strong`，字 `--ink-2`

### 2.3 SegmentedControl（提前量等）

- 通栏或内容宽；选中段底 `--card-2` + 金下划线 2px
- 键盘左右箭头可切换

### 2.4 Switch

- 标准 51×31 iOS 比例
- 开：轨道 `--gold`；关：轨道 `--ink-3` 30%
- 行内左侧标签 `body`，右侧 Switch

### 2.5 TextField / TextArea

- 底 `--card-2`，边 `--line-strong`，`r-sm`
- 聚焦：边 `--gold`，2px
- 错误：边 `--danger`，下方 `caption --danger`
- 导入 TextArea：`--font-num` 13px，高 ≥ 160，可滚动

### 2.6 Badge

| 变体 | 样式 |
|---|---|
| 升级中 | 底 `--gold-weak` 字 `--gold` |
| 研究中 | 底 `--lab-weak` 字 `--lab` |
| 已完成 | 底 `rgba(61,220,151,.15)` 字 `--ok` |
| 警告 | 底 `rgba(245,165,36,.15)` 字 `--warn` |
| 事件 | 底 `--event-weak` 字 `--event` |

`r-pill`，字 `overline`，高 22，左右 8。

### 2.7 ProgressBar

- 高 6，`r-pill`，轨道 `--card-2`
- 填充：lane 色（金/紫/事件蓝）
- ≤5min：填充 `--warn`，可选 2s 透明度呼吸（`prefers-reduced-motion` 关闭）
- `role="progressbar"` + aria 值

### 2.8 ListRow

```
[ 图标/色点 24 ]  标题 body-strong
                  副文 caption --ink-2     [右值/徽章]
```

- 高 ≥ 56，点击区通栏
- 分隔线 `--line`，缩进对齐标题

### 2.9 EmptyState

- 居中，插画 ≤ 120×80，主文案 `title-sm`，副 `caption`
- 最多 1 个主 CTA + 1 个 ghost

### 2.10 ErrorBanner

- 底 `rgba(240,113,120,.12)`，左 3px `--danger`
- 文案 + 可选行动按钮

### 2.11 Skeleton

- 块底 `--card-2`，微弱透明度动画（关闭 reduce-motion）
- 与真实卡片同高，避免跳动

### 2.12 Toast

- 底部，距底栏 16，`r-md`，底 `--card-2` + 边 `--line-strong`
- 成功可带 `--ok` 小图标；2.5s 消失

---

## 3. 业务组件

### 3.1 CountDownCard（倒计时卡）

| 区 | 内容 | 备注 |
|---|---|---|
| 头 | lane 图标/色条 + 名称 + Badge | 左 3px 色条可选 |
| 等级 | `11 → 12` caption | |
| 时间 | `display-time` tabular | **最大元素** |
| 进度 | ProgressBar + 完成时刻 caption | |
| 尾 | 可选 chevron | 进 Sheet |

**Props（概念）**：`name, kind, fromLevel, toLevel, finishAt, lane, state`  
**状态**：`running | almost | done | muted`

### 3.2 LaneTag

| lane | 文案 | 色 |
|---|---|---|
| builder | 建筑工 | `--gold` |
| lab | 实验室 | `--lab` |
| goblin | 哥布林工 | `--warn` |
| helper | 助手 | `--event` |
| unknown | 其他 | `--ink-3` |

### 3.3 SnapshotBar（数据状态条）

| 级别 | 样式 | 文案示例 |
|---|---|---|
| fresh | `--ink-3` | 数据更新于 2 小时前 |
| stale | `--warn` | 建议重新导出 · 超过 1 天 |
| critical | `--danger` | 数据可能过时 · 超过 3 天 |

右侧文字按钮「重新导入」。

### 3.4 StatCard（进度总览）

- 大数字 `display-n` + 标签 caption
- 可含 1 条 ProgressBar
- 深色卡 `--card`，可点进筛选

### 3.5 EventCard

| 变体 | 用途 |
|---|---|
| hero | P-05 下一事件，高 ≥ 120，剩余时间 `display-time` |
| row | 列表行，含类型色点 + 窗口日期 |

### 3.6 BoostRow

- 左名称，右剩余 `font-num`
- 手动校准：Badge「已校准」`--ok` 弱底

### 3.7 ConfirmDialog

- 标题 + 说明 + 双按钮
- 危险确认：确认钮 `danger`，默认焦点在取消

---

## 4. 关键状态矩阵

### 4.1 倒计时卡

| 状态 | 时间色 | 进度 | 额外 |
|---|---|---|---|
| running | `--ink` | lane 色 | — |
| almost（≤5min） | `--warn` | warn + 呼吸 | Badge「即将完成」 |
| done | `--ink-3` | 100% ok | Badge「已完成」，opacity .55 |
| stale-global | 保持 | 保持 | SnapshotBar 警告 |
| clock-error | `--warn` | 冻结 | 顶栏警告条 |

### 4.2 权限（通知）

| 系统状态 | 卡片 | CTA |
|---|---|---|
| default | 「开启提醒」 | 请求权限 |
| granted | 「已开启」 | 管理细节 |
| denied | danger 文案 | 去系统设置 |
| unsupported | 说明 iOS/桌面限制 | 隐藏 CTA |

---

## 5. 间距与组合规则

| 规则 | 值 |
|---|---|
| 卡片列表 gap | 12 |
| 分区标题上间距 | 24，下 12 |
| 分区标题 | `overline --ink-3`，可带 1px 线 |
| 页头到内容 | 16 |
| 底栏上方留白 | 24 + safe-area |
| 最大内容宽 | 480（居中） |

---

## 6. 可访问性清单（组件级）

| 组件 | 要求 |
|---|---|
| Button | 名称唯一；loading 不重复触发 |
| Switch | `role="switch"` + `aria-checked` |
| CountDownCard | `aria-label` 含名称+剩余时间；`aria-live="polite"` 节流 |
| ProgressBar | `aria-valuenow/min/max` |
| Sheet | 焦点陷阱；关闭后焦点回触发元素 |
| Toast | `role="status"` |
| 色点 | 非唯一信息，附文字 |

---

## 7. 组件验收

- [ ] 所有颜色/字号引用 UI-SPEC-00 Token
- [ ] CountDownCard 四态视觉可区分（不靠单一颜色）
- [ ] 触控目标 ≥ 44
- [ ] Sheet/Modal 可键盘关闭（Esc）
- [ ] Skeleton 与真实布局同高
- [ ] 危险操作有 ConfirmDialog
- [ ] reduced-motion 下无呼吸/位移动画
