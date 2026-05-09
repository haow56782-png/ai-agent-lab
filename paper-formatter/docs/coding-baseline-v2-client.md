# 编码基线规范 v2.0 — 前端落地版

> 基于通用 v2.0 基线，翻译为 React / TypeScript / 页面交互的具体实现规约
> 适用范围: `paper-formatter/services/client/`
> 版本: v2.0-client.1 | 状态: Accepted | 对应通用基线: [coding-baseline-v2.md](./coding-baseline-v2.md)

---

## 目录

- [第一部分：组件职责分离](#第一部分组件职责分离)
- [第二部分：API 层契约](#第二部分api-层契约)
- [第三部分：状态归属规则](#第三部分状态归属规则)
- [第四部分：Mock / Fallback 显式标注](#第四部分mock--fallback-显式标注)
- [第五部分：Comment 契约](#第五部分comment-契约)
- [第六部分：Effect 与轮询规约](#第六部分effect-与轮询规约)
- [第七部分：目录与文件规约](#第七部分目录与文件规约)
- [第八部分：评审清单（前端专有）](#第八部分评审清单前端专有)
- [第九部分：与通用基线的差异对照](#第九部分与通用基线的差异对照)

---

## 第一部分：组件职责分离

### 1.1 两条铁律

> **铁律 I：一个文件只做容器或展示之一，不两头都占。**
> **铁律 II：容器可以"薄"但不可以"空"，展示可以"多"但不可以"乱"。**

### 1.2 容器组件（Container）

职责：状态来源、数据流编排、副作用管理。

```
容器拥有什么？
├─ useState / useReducer / Context 的读取与写入
├─ useEffect 的启动与清理
├─ useCallback 产生的事件处理函数
└─ 将数据 + 回调通过 props 注入展示组件

容器不做什么？
├─ 不写 style={{}} —— 样式全在展示层
├─ 不直接返回大段 JSX DOM 树 —— 只做组合布局
└─ 不处理细节交互 —— 只处理"什么数据"和"哪个状态"
```

✅ 容器示例（理想形态）：

```tsx
// Step3Parse/index.tsx —— 容器
const Step3Parse: React.FC = () => {
  const [parseState, dispatch] = useReducer(parseReducer, initialParseState);
  const { data, error, status } = useApiPolling({
    fetcher: () => api.getJob(jobId),
    shouldStop: (j) => j.status === 'completed' || j.status === 'failed',
    interval: 1200,
    maxAttempts: 60,
  });

  useEffect(() => {
    if (status === 'success' && data) {
      dispatch({ type: 'PARSE_COMPLETE', payload: data });
    }
  }, [status, data]);

  return (
    <div className="parse-layout">
      <ScanAnimation progress={parseState.percent} />
      <StageProgress stages={parseState.stages} />
      <ResultCard
        score={parseState.score}
        issues={parseState.issues}
        onFix={() => navigate('/fix')}
      />
    </div>
  );
};
```

### 1.3 展示组件（Presentational）

职责：接收 props，渲染 UI，通过回调通知上层。

```
展示拥有什么？
├─ style / className —— 所有样式、动画
├─ 本地展现状态（hover、toggle、accordion open/close）
└─ 从 props 解构的数据 + 事件回调

展示不做什么？
├─ 不调用 API、不读取 Context
├─ 不使用 useEffect（展现动画除外）
├─ 不管理"业务状态" —— 不存 selectedId、不存 parseResult
└─ 不从 api/client.ts 导入任何内容
```

✅ 展示组件示例（理想形态）：

```tsx
// Step3Parse/StageProgress.tsx —— 纯展示
interface StageProgressProps {
  stages: StageDescriptor[];
  activeIndex: number;
}

const StageProgress: React.FC<StageProgressProps> = ({ stages, activeIndex }) => (
  <div className="stage-track">
    {stages.map((s, i) => (
      <div key={s.stage} className={clsx('stage-node', {
        'is-done': i < activeIndex,
        'is-active': i === activeIndex,
      })}>
        <span className="stage-label">{s.displayName}</span>
        {i === activeIndex && <ScanDot />}
      </div>
    ))}
  </div>
);
```

### 1.4 当前代码的诊断对照

| 文件 | 当前问题 | 方向 |
|------|----------|------|
| `Step2Profile.tsx` | 容器兼做大量内联 style + 展示细节（~660 行） | 将规则速览、学校卡片、检测 banner 拆为展示组件 |
| `Step3Parse.tsx` | 容器 + 全部 UI 在一个文件（~1330 行） | 容器 `Step3Parse/index.tsx` + `ScanAnimation.tsx` + `StageProgress.tsx` + `ResultCard.tsx` |
| `Step4Fix.tsx` | 修复步骤列表 + 状态管理混合 | 步骤列表抽取为 `FixStepList.tsx` |
| `AppFrame.tsx` | Sidebar/TopBar 定义在全局状态文件里 | 移动至 `components/Sidebar.tsx` + `components/TopBar.tsx` |

---

## 第二部分：API 层契约

### 2.1 分层职责

```
api/
├── _base.ts      ← ④ Adapter：fetch 封装，统一处理 4xx/5xx → ApiError
├── client.ts     ← ④ Adapter：方法级封装，每条 API 一个方法
├── document.ts   ← ④ Adapter：文档相关 API
└── job.ts        ← ④ Adapter：任务相关 API
```

### 2.2 `_base.ts` 做什么

```typescript
// _base.ts —— 全局只有一个，所有 API 文件共用
const BASE = '/api/v1';

export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: ApiError };

async function request<T>(path: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const apiError: ApiError = {
        code: body?.code || 'UNKNOWN',
        message: body?.message || `HTTP ${res.status}`,
        retryable: res.status >= 500,
      };
      return { ok: false, error: apiError };
    }
    return { ok: true, value: await res.json() };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network error',
        retryable: true,
      },
    };
  }
}
```

### 2.3 `client.ts` 做什么

每个方法封装一个 API 端点，**只做三件事**：

1. 拼路径和参数
2. 调用 `request()`
3. 返回 `Result<T>`（保持类型）

```typescript
// ✅ client.ts —— 方法只做"协议映射"，不做业务判断
export const api = {
  detectSchool: (docId: string) =>
    request<DetectSchoolResponse>('/profiles/detect', {
      method: 'POST',
      body: JSON.stringify({ docId }),
    }),

  getJob: (jobId: string) =>
    request<JobRecord>(`/jobs/${jobId}`),
};
```

### 2.4 当前代码的诊断

**当前 `client.ts` 的 `request()` 函数（第 130 行）存在问题：**

```typescript
// ❌ throw —— 违反 3.2 节契约
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (!res.ok) {
    throw new Error(...);  // ← 调用方只能用 try-catch，无法区分错误类型
  }
  return res.json();
}
```

**底线整改项：**

1. 新建 `api/_base.ts`，实现 `Result<T>` + `request<T>()`
2. 将 `client.ts` 的 `request()` 改为基于 `_base.ts`，返回值改为 `Promise<Result<T>>`
3. 所有调用方（Step2Profile、Step3Parse 等）从 `try-catch` 改为 `if (!result.ok)` 判断
4. **特例**：`uploadDocument()` 使用 XHR 进度跟踪，保持特殊实现但必须返回 `Promise<Result<DocumentRecord>>`

---

## 第三部分：状态归属规则

### 3.1 状态权威归属表

| 状态 | 所有者 | 为什么 |
|------|--------|--------|
| 文档列表、学校 profiles | 后端 DB | 跨用户、跨会话 |
| 用户偏好、检测到的学校缓存 | localStorage | 跨会话但不跨用户 |
| 当前步骤、选中学校、解析结果 | Context (`AppCtx`) | 跨多个页面组件，不持久化 |
| 搜索框文本 `q` | 组件 `useState` | 只在 Step2Profile 中使用 |
| 解析阶段、置信度列表 | `useReducer` (局部) | 完全属于 Step3 的生命周期 |
| Modal open/close、hover 状态 | 组件 `useState` | 纯展现，不跨组件 |

### 3.2 反模式对照

| ❌ 反模式 | 问题 | ✅ 正确做法 |
|-----------|------|------------|
| Step2Profile 里 `schoolOptions` 和 `AppCtx` 各存一份学校列表 | 两份状态，必须同步 | `getSchoolOptions()` 实时读取，不缓存 |
| Step1Upload 用自己的 `uploadCountMap`，Step2Profile 也有一套 | 重复状态 | Step1Upload 在 modal 打开时按需 fetch，不持久 |
| `schoolId` 存在 Context 里，又传进 URL query | 一个数据两个来源 | 只用 Context，不额外写 URL |
| Step2Profile 的 `detectedSchool` 和 `extraSchools`、`schoolOptions` 三者部分重叠 | 交叉重复 | `detectedSchool` 只存检测结果（不存学校完整数据），`extraSchools` 只补后端才有前端没有的 |

### 3.3 状态添加检查清单

新增任何 `useState` / `Context` 字段前，回答：

1. [ ] 这份数据有没有其他来源？（后端？localStorage？Context？URL？）
2. [ ] 如果有，谁是权威？另一个来源能否直接替代？
3. [ ] 如果权威变了，我怎么知道？需要写同步逻辑吗？
4. [ ] 如果不需要同步 —— 说明应该只有一个来源，删掉另一个。

---

## 第四部分：Mock / Fallback 显式标注

### 4.1 红线

> **不伪成功** —— 不能展示"看起来加载完了但数据是 mock"的界面。

### 4.2 标注规则

| 场景 | 标注方式 | 示例 |
|------|----------|------|
| 开发阶段硬编码数据 | 文件头注释 `@MOCK` + 组件内视觉标注 | `// @MOCK Step3 demo data, remove when job polling is wired` |
| API 失败后的降级数据 | 页面 toast "部分数据不可用" + 降级区域 `.is-fallback` 类 | `showToast('解析报告暂不可用，显示本地预览');` |
| 尚未对接的 stub | 方法名后缀 `Stub` | `createJobStub()` 而非 `createJob()` |

### 4.3 当前代码诊断

```typescript
// ❌ Step3Parse.tsx 第 610 行 —— 伪成功
function runSimulated() {
  // 没有标注这是 mock/fallback
  // 用户看到完整的解析页面，但数据是本地生成的
}

// ✅ 修复方案：
// @MOCK 此路径在 docId === 'demo' 时触发，移除后接入真实 job 轮询
function runSimulated() { ... }
```

**所有 mock 路径必须满足**：
1. 触发的条件一目了然（如 `docId === 'demo'` 或 `if (config.mock)`）
2. 函数有 `@MOCK` 标注
3. 组件内 mock 路径和真实路径的视觉可区分（加 `.chip-warn` 提示 "预览模式"）

---

## 第五部分：Comment 契约

### 5.1 前端专有的三种合法注释

除通用基线三类（Why、TODO/FIXME、JSDoc）外，前端额外允许：

**4. Effect 注释** —— 解释 effect 为什么必须存在、为什么依赖这个数组

```typescript
// 这个 effect 必须在 docId 变化时重置整个 parse state，否则
// 用户切换文档后 Step3 会展示上一份文档的残留结果
useEffect(() => {
  dispatch({ type: 'RESET' });
}, [docId]);
```

**5. State 注释** —— 解释这个状态存在的理由、它的权威来源

```typescript
// uploadCountMap 只在 school modal 打开时按需 fetch，
// 不持久化、不与 AppCtx 同步——它是只读展示数据
const [uploadCountMap, setUploadCountMap] = useState<Record<string, number>>({});
```

### 5.2 禁止的前端注释

```typescript
// ❌ 语法注释 —— 在教 TypeScript 开发者写 TypeScript
// 遍历数组并过滤空值
const items = arr.filter(Boolean);

// ❌ 缩写注释 —— 省了命名字的功夫，转移给读者
// 获取 el 的 rect 做 pos 计算

// ❌ 死代码注释 —— 相信自己不用的代码应该删掉不是注释掉
// const PAGE_SIZE = 10;
// const PAGE_SIZE = 20;

// ❌ 显而易见注释
// 点击取消按钮
<button onClick={onCancel}>取消</button>
```

### 5.3 当前代码对标

```typescript
// ✅ 应该保留的注释（Step2Profile.tsx）
// 检测结果在 Step2 mount 时触发，不在 Step3——用户选学校之前就能看到结果
useEffect(() => {
  if (!state.docId) return;
  ...
}, [state.docId]);

// 这份 effect 分开两段写需要解释：
// ✅ 第二个 effect 在 schoolId 变化时刷新 uploadCount，
// 不能和第一个 effect 合并，因为用户可能手动切换学校
useEffect(() => {
  ...
}, [state.schoolId, state.docId]);
```

---

## 第六部分：Effect 与轮询规约

### 6.1 通用基线第 2.2 节投影

前端只有四种合法数据获取形态，归属必须明确：

| 形态 | 适用场景 | 必须包含 | 禁止 |
|------|----------|----------|------|
| **一次性 fetch** | 页面初始化数据 | loading + error + empty 三态 | 在 fetch 之后又改 URL params 不重取 |
| **用户触发** | 按钮点击搜索/提交 | 防重复提交 (`disabled`) | 在 loading 状态下再次触发 |
| **轮询** | Job 状态、长任务 | 退避 + 最大次数 + 取消 | 无限轮询、无取消的 `setInterval` |
| **推送** | 实时进度 | 心跳 + 断线重连 | 重新挂载后开多个连接 |

### 6.2 轮询实现规约

当前 Step3Parse 的轮询实现（第 521-601 行）需要改造对齐：

```typescript
// ✅ 标准形态
const polling = useApiPolling({
  fetcher: () => api.getJob(jobId),
  shouldStop: (job) => job.status === 'completed' || job.status === 'failed',
  interval: 1200,
  backoff: 'linear',
  maxAttempts: 60,
  onError: (err) => err.retryable ? 'retry' : 'abort',
});

// 调用方只需要读 polling.data / polling.status / polling.error
// 不需要自己写 setTimeout 链
```

**当前轮询代码（Step3Parse 第 524-601 行）的问题：**

```typescript
// ❌ 问题 1：递归 setTimeout 无显式取消
const poll = async () => {
  if (cancelled) return;       // cancelled flag 是手动的
  ...
  setTimeout(poll, POLL_INTERVAL);  // 对比：useApiPolling 返回 cancel()
};

// ❌ 问题 2：退避策略缺失
const POLL_INTERVAL = 1200;     // 固定间隔，没有 backoff

// ❌ 问题 3：错误处理直接 fallback 而不是 retry
} catch (err: any) {
  showToast(`状态查询失败: ${err.message}`);
  fallbackComplete();           // 第一次失败就 fallback
}
```

### 6.3 `useEffect` 依赖规约

```typescript
// ❌ 空依赖 —— 静态分析无法验证意图
useEffect(() => { ... }, []);

// ✅ 显式依赖 —— 即使依赖变化会重新执行，也不隐藏
useEffect(() => {
  if (!jobId) return;
  startPolling(jobId);
}, [jobId]);
```

**特殊情况**：只有 `dispatch` 和 `setState`（稳定引用）可以安全省略。

---

## 第七部分：目录与文件规约

### 7.1 目标目录结构

对照通用基线第 5.4 节投影，逐步收敛：

```
client/src/
├── types/                  # ③ Utility：纯类型，无运行时
│   ├── result.ts           # Result<T, E> + ApiError
│   └── domain.ts           # ParseStage, JobStatus, RuleResult 等
├── api/                    # ④ Adapter：与后端通信
│   ├── _base.ts            # fetch 封装 + Result 返回
│   ├── client.ts           # 方法级封装，不拆分过细
│   └── analytics.ts        # 第三方（仅事件上报，非业务 API）
├── hooks/                  # ② Orchestration：跨组件业务逻辑
│   ├── useApiPolling.ts    # 轮询 hook
│   └── useParseJob.ts      # Step3 专属：创建 job → 轮询 → 完成
├── domain/                 # ① Domain：业务规则
│   └── rules.ts            # RuleDefinition, RULE_COUNT, getRulesByCategory
├── components/             # ④ Adapter + UI：复用展示组件
│   ├── Common.tsx          # Icon, Btn, 全局原子组件
│   ├── RulesModal.tsx
│   ├── RulesModal.tsx
│   ├── Step3Parse/         # 容器 + 拆分子组件
│   │   ├── index.tsx       # 容器
│   │   ├── ScanAnimation.tsx
│   │   └── StageProgress.tsx
│   ├── Sidebar.tsx         # 从 AppFrame 抽取
│   └── TopBar.tsx          # 从 AppFrame 抽取
├── screens/                # ④ Adapter：页面级容器（对应路由）
│   ├── Step1Upload.tsx
│   ├── Step2Profile.tsx
│   ├── Step3Parse.tsx
│   ├── Step4Fix.tsx
│   ├── Step4Diff.tsx
│   └── Step5Output.tsx
└── constants/              # ③ Utility：纯常量
    └── rules.ts            # ALL_RULE_GROUPS（移到 domain/rules.ts）
```

### 7.2 文件导出规约

```typescript
// ✅ 默认导出 = 组件自身，与文件名一致
// Step3Parse/index.tsx
const Step3Parse: React.FC = () => { ... };
export default Step3Parse;

// ✅ 具名导出 = 类型 + 工具函数
// types/result.ts
export type Result<T, E = ApiError> = ...;
export type ApiError = ...;

// ❌ 禁止：一个文件导出多个组件 / 类型混用
// 反例：AppFrame.tsx 同时导出 AppState、SchoolOption、Sidebar、TopBar
```

---

## 第八部分：评审清单（前端专有）

### 组件职责

- [ ] 每个 `.tsx` 文件要么是容器要么是展示，不混合
- [ ] 容器没有 `style={{}}`（交给展示组件或 CSS）
- [ ] 展示组件没有 API 调用、没有 `useEffect`（展现动画除外）
- [ ] props 名称使用业务语言：`onSchoolSelect` 而非 `onChange`

### API 层

- [ ] `api/client.ts` 所有方法返回 `Promise<Result<T>>`，不 throw
- [ ] 调用方用 `if (!result.ok)` 而非 `try-catch`
- [ ] `_base.ts` 统一处理 4xx/5xx → `ApiError`，各方法不重复
- [ ] 没有页面直接写 `fetch()` 或 `axios` 调用

### 状态归属

- [ ] 每个 `useState` 能回答"谁是权威来源"
- [ ] 同一份数据不在两个地方各存一份
- [ ] 没有"存一份再写代码同步"的模式

### Mock / Fallback

- [ ] 所有 mock 路径有 `@MOCK` 文件头标注
- [ ] mock 和真实路径视觉可区分（toast 提示、chip 标注）
- [ ] 没有"看起来正常但数据是假的"界面

### Effect

- [ ] 每个 `useEffect` 依赖数组明确，没有空依赖
- [ ] 轮询有三件套：退避策略、最大次数、取消机制
- [ ] 没有无限 `setInterval` 或递归 `setTimeout`
- [ ] 清理函数 `return () => { cancelled = true; }` 存在

### Comment

- [ ] effect 上方一行注释解释"为什么这个 effect 必须存在"
- [ ] 非显然的 state 上方注释解释"这个状态为什么在这里"
- [ ] 无语法注释、无死代码注释
- [ ] TODO 带责任人 + 时间预期

---

## 第九部分：与通用基线的差异对照

| 维度 | 通用基线 v2.0 表述 | 前端落地版转化 |
|------|-------------------|---------------|
| 四象限 | Domain / Orchestration / Utility / Adapter | `domain/`、`hooks/`、`types/`、`api/` 四个目录 |
| 不伪成功 | 后端不返回伪 200 | 前端 mock 数据必须标注、mock 与真实路径视觉可区分 |
| 不吞错 | catch 需要做决定 | 调用 API 用 `if (!result.ok)`，不可忽略 |
| 状态归属 | 通用决策树 | 前端状态权威归属表 + 反模式对照 |
| 轮询三件套 | 退避 + 最大次数 + 取消 | `useApiPolling` hook 作为唯一实现方式 |
| 注释 | Why / TODO / JSDoc | 增加 Effect 注释 + State 注释 |
| 函数 ≤ 30 行 | 通用 | 容器组件不受 30 行限制（组合比拆分更重要） |
| 评审清单 | 按架构特性组织 | 按前端角色组织：组件职责 / API / 状态 / Mock / Effect / Comment |

---

**版本信息**

- 版本号: v2.0-client.1
- 状态: Accepted
- 起草日期: 2026-05-10
- 对应通用基线: [coding-baseline-v2.md](./coding-baseline-v2.md)
- 下次回顾: 2026-08-10
