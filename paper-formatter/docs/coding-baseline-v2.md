# 编码基线规范 v2.0

> 基于《Fundamentals of Software Architecture》(Mark Richards & Neal Ford) 重构
> 适用范围:paper-formatter 及后续所有项目的统一输出标准
> 版本:v2.0 | 状态:Accepted | 上一版本:v1.0(coding-baseline.md)

---

## 目录

- [第一部分:基线哲学(Why)](#第一部分基线哲学why)
- [第二部分:架构思维(How to Think)](#第二部分架构思维how-to-think)
- [第三部分:实现规范(What to Write)](#第三部分实现规范what-to-write)
- [第四部分:架构决策记录(ADR)](#第四部分架构决策记录adr)
- [第五部分:针对 paper-formatter 的具体落地](#第五部分针对-paper-formatter-的具体落地)
- [第六部分:评审清单](#第六部分评审清单)
- [第七部分:基线的演进机制](#第七部分基线的演进机制)
- [附录:与 v1.0 的核心差异](#附录与-v10-的核心差异)

---

## 第一部分:基线哲学(Why)

### 1.1 核心命题

> **架构是关于权衡的艺术,工程是关于可解释性的科学。**

代码可工作 ≠ 代码达标。基线的目的不是"让代码能跑",而是让代码具备**长期可信任的属性**。这些属性是显式选择的,不是默认获得的。

### 1.2 本基线优先保障的架构特性(按优先级)

| 优先级 | 特性 | 含义 | 放弃了什么 |
|---|---|---|---|
| P0 | **可维护性** Maintainability | 6 个月后的人(包括你自己)能读懂、能改对 | 牺牲极致简洁、牺牲炫技 |
| P0 | **可演进性** Evolvability | 业务规则变化时,改动范围可控 | 牺牲过早优化、牺牲一次成型的"完美架构" |
| P1 | **可测试性** Testability | 关键逻辑能在不启动整个系统的情况下被验证 | 牺牲深度耦合带来的便利 |
| P1 | **可观测性** Observability | 出问题时能快速定位"在哪儿坏的、为什么坏" | 牺牲无日志的"干净"代码 |
| P2 | **性能** Performance | 在用户感知尺度上不卡顿 | 不追求微观最优,追求体感达标 |

**关键原则:这是一个有序列表,不是平铺清单。** 当 P0 与 P2 冲突时,P0 胜出。例如:为了 100ms 性能优化而引入难以理解的位运算,在本基线下不被接受。

### 1.3 三条不可妥协的红线

1. **不吞错** —— 任何 catch 块必须做出一个明确决定:重抛、转换、记录、降级。空 catch 等同于代码事故。
2. **不伪成功** —— 后端不能返回"看起来 200 但实际失败"的响应;前端不能展示"看起来加载完了但数据是 mock"的界面。
3. **不隐藏依赖** —— 函数依赖的外部状态(时间、随机数、网络、数据库、全局变量)必须显式表达在签名或文档中。

---

## 第二部分:架构思维(How to Think)

### 2.1 组件化思维:四象限定位

每写一个新模块前,先回答两个问题,把它放进四象限的某一格:

```
                    业务规则强 ────────────────
                          │                  │
                          │   ① Domain       │   ② Orchestration
                          │   领域核心       │   业务编排
              纯逻辑 ─────┼──────────────────┼───── 有副作用
                          │   ③ Utility      │   ④ Adapter
                          │   工具函数       │   外部适配(I/O)
                          │                  │
                    业务规则弱 ────────────────
```

| 象限 | 典型位置 | 测试策略 | 依赖方向 |
|---|---|---|---|
| ① Domain | `entities/`, `value-objects/`, `domain/services/` | 单元测试,无 mock | 不依赖任何下层 |
| ② Orchestration | `services/`, `use-cases/`, `application/` | 集成测试 + mock 适配器 | 依赖 ① 和 ④ 的接口 |
| ③ Utility | `utils/`, `lib/`, `shared/` | 纯单元测试 | 不依赖任何业务 |
| ④ Adapter | `api/`, `repositories/`, `clients/`, `controllers/` | 契约测试 | 实现 ② 定义的接口 |

**依赖方向铁律:箭头永远从外向内** —— ④ → ② → ①,③ 谁都可以用。**反向依赖是架构腐败的第一信号。**

### 2.2 数据流的三种形态

软件架构实践强调:**数据流形态决定架构形态**。本基线只承认三种合法形态,任何模块必须明确归属其一:

| 形态 | 特征 | 代表场景 | 实现要点 |
|---|---|---|---|
| **请求-响应** | 同步、有界、立即返回 | 表单提交、查询接口 | 显式 timeout、显式 error 类型 |
| **轮询/拉取** | 客户端主动、有限次、有退避 | Step3 解析 job、长任务状态 | 退避策略、最大次数、取消机制三件套必须齐全 |
| **流式/推送** | 服务端主动、连续、可中断 | SSE 进度、WebSocket | 心跳、断线重连、消息序号 |

**反模式:在请求-响应里偷偷做长任务、在轮询里没有退避、在流式里没有断线处理 —— 这些都属于"形态混乱",一律按基线违例处理。**

### 2.3 状态归属决策树

每一份状态(state),只能有一个权威所有者(single source of truth)。新增状态时按下面顺序判断:

```
这份状态是否跨用户?
├─ 是 → 数据库(后端权威)
└─ 否 → 是否跨会话?
        ├─ 是 → 持久化存储(localStorage / 后端用户配置)
        └─ 否 → 是否跨页面/路由?
                ├─ 是 → 全局 store(Zustand/Redux/Context)
                └─ 否 → 是否跨组件?
                        ├─ 是 → 父组件 useState + props
                        └─ 否 → 组件本地 useState
```

**反模式:同一份状态在两个地方各存一份,然后写代码同步它们 —— 这是 bug 工厂。**

---

## 第三部分:实现规范(What to Write)

### 3.1 函数级规范

| 维度 | 标准 | 阈值 |
|---|---|---|
| 长度 | 一屏可读完 | ≤ 30 行(含注释) |
| 圈复杂度 | 控制流分支可数 | ≤ 8 |
| 参数数量 | 超过则用对象封装 | ≤ 4 |
| 命名 | 动宾结构,业务语言 | `approveProfileChange` 而非 `updateData` |
| 返回点 | 早返回防嵌套 | 嵌套 ≤ 3 层 |

### 3.2 错误处理的统一形态

**后端响应契约(雷打不动):**

```json
{
  "code": "NOT_FOUND",
  "message": "Document doc_xxx not found",
  "data": null
}
```

合法的 `code` 取值约定为大写下划线常量,例如:`NOT_FOUND`、`VALIDATION_ERROR`、`INTERNAL_ERROR`、`RATE_LIMITED`、`UNAUTHORIZED`。新增 code 必须更新 `docs/error-codes.md`。

**前端 Result 类型(雷打不动):**

```typescript
type Result<T, E = ApiError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

interface ApiError {
  code: string;        // 与后端 code 对齐
  message: string;     // 用户可见
  retryable: boolean;  // 显式标记是否可重试
}
```

**调用方写法(雷打不动):**

```typescript
const result = await documentApi.upload(file);
if (!result.ok) {
  // 必须处理,不能忽略
  return handleError(result.error);
}
// 进入这里 result.value 类型自动收窄,无需断言
processDocument(result.value);
```

### 3.3 注释的三种合法形态

只有这三种注释允许保留,其余删除:

**1. Why 注释** —— 解释决策、权衡、非显然的约束

```typescript
// 轮询间隔 500ms 是性能与体感的平衡点:
// < 300ms 服务器压力陡增,> 1s 用户感觉卡顿
const POLL_INTERVAL_MS = 500;
```

**2. TODO/FIXME 注释** —— 必须带责任人和时间预期

```typescript
// TODO(wanghao, 2026-Q2): 切换到 SSE 后移除轮询逻辑
```

**3. 公开 API 的 JSDoc/TSDoc** —— 描述契约、示例、异常

```typescript
/**
 * 上传文档并创建解析任务
 * @throws {ValidationError} 文件大小超限或格式不支持
 * @returns 任务 ID,用于后续轮询
 */
```

**禁止的注释:** 解释语法的(`// 遍历数组`)、注释掉的死代码、重复函数名的废话注释。

### 3.4 命名规约

| 类型 | 规则 | 示例 |
|---|---|---|
| 变量 | 名词,可读为完整短语 | `pendingDocuments` 而非 `pdocs` |
| 布尔 | `is/has/can/should` 前缀 | `isUploading`、`canRetry` |
| 函数 | 动宾结构,业务语言优先 | `extractTableOfContents` 而非 `getTOC` |
| 常量 | `SCREAMING_SNAKE`,带单位 | `POLL_INTERVAL_MS`、`MAX_FILE_SIZE_MB` |
| 类型/接口 | 名词,业务概念 | `ParseStage`、`DocumentJob` |
| 文件 | 与默认导出同名 | `Step3Parse.tsx` 导出 `Step3Parse` |

### 3.5 防御性编程的边界

防御性编程不等于"到处加 if 检查",它有清晰的作用域:

| 场景 | 是否需要防御 | 理由 |
|---|---|---|
| 跨进程边界(API、文件、数据库) | **必须** | 外部输入永远不可信 |
| 跨模块边界(public 接口) | **必须** | 调用者可能误用 |
| 模块内私有函数 | **不需要** | 已被边界保护,加检查是噪音 |
| TypeScript 类型已保证的字段 | **不需要** | 重复检查破坏类型系统的价值 |

**反模式:在已经类型安全的内部函数里,对每个参数 `if (!x) return` —— 这是噪音,不是防御。**

---

## 第四部分:架构决策记录(ADR)

软件架构实践明确指出:**没有记录的决策等于没有决策**。本项目所有结构性选择必须以 ADR 形式留痕。

### 4.1 ADR 触发条件

出现以下任一情况,必须写一份 ADR:

- 引入新的运行时依赖库(非工具链)
- 选择了 A 方案而放弃了 B、C 方案
- 跨多个模块的命名/结构约定
- 涉及性能、安全、可用性的权衡
- 修改本基线本身

### 4.2 ADR 标准模板

```markdown
# ADR-NNN: [决策标题]

## 状态
Proposed | Accepted | Deprecated | Superseded by ADR-XXX

## 上下文
[为什么现在要做这个决策?背景是什么?]

## 决策
[我们决定做什么?一句话说清。]

## 备选方案
- 方案 A: [描述] —— 放弃原因
- 方案 B: [描述] —— 放弃原因

## 后果
- 正面: [我们获得了什么]
- 负面: [我们放弃了什么、引入了什么风险]

## 重新评估触发条件
[在什么情况下应该重新审视这个决策?]
```

### 4.3 ADR 存放位置

```
docs/
└── adr/
    ├── 0000-record-architecture-decisions.md   # 元 ADR:为什么用 ADR
    ├── 0001-frontend-state-management.md
    ├── 0002-error-response-contract.md
    └── ...
```

### 4.4 ADR 编号规则

- 四位数字,从 0000 开始,严格递增
- 编号一旦分配不再回收,即使 ADR 被废弃
- Superseded 的 ADR 保留原文,在状态行注明替代者

---

## 第五部分:针对 paper-formatter 的具体落地

把上述基线投影到当前的客户端实现:

### 5.1 立即对齐项(P0,本周内)

1. **建立 `client/src/types/result.ts`** —— 定义 `Result<T, E>` 类型,所有 API 必须返回此形态
2. **建立 `client/src/api/_base.ts`** —— 统一 fetch 封装,自动处理 4xx/5xx → ApiError 转换
3. **写第一份 ADR-0001** —— 记录"为什么用 Result 而不用 try-catch"
4. **写 ADR-0002** —— 记录后端错误响应契约

### 5.2 Step3 解析页对齐(P0)

`ParseStage` 类型设计完全符合"近模型规则",但需要补充:

```typescript
// ✅ 当前
type ParseStage = 'uploading' | 'queued' | 'extracting' | 'parsing' | 'checking' | 'complete';

// ✅ 增强:每个 stage 必须能回答三个问题
interface StageDescriptor {
  stage: ParseStage;
  displayName: string;        // 给用户看的中文
  estimatedDuration: number;  // 预估耗时(ms),用于动画节奏
  canCancel: boolean;         // 这个阶段能否中断
}
```

### 5.3 useApiPolling Hook 契约(P1)

按照 2.2 节"轮询三件套必须齐全"的要求,hook 接口必须长这样:

```typescript
function useApiPolling<T>(config: {
  fetcher: () => Promise<Result<T>>;
  shouldStop: (data: T) => boolean;        // 显式终止条件
  interval: number;                         // 基础间隔
  backoff?: 'linear' | 'exponential';       // 退避策略
  maxAttempts: number;                      // 最大次数
  onError?: (e: ApiError) => 'retry' | 'abort'; // 错误决策
}): {
  data: T | null;
  error: ApiError | null;
  status: 'idle' | 'polling' | 'success' | 'failed';
  cancel: () => void;                       // 取消机制
};
```

**没有 `cancel` 的轮询 hook,在本基线下不被接受。**

### 5.4 目录结构投影

```
client/src/
├── types/              # ③ Utility:纯类型定义,跨层共享
│   ├── result.ts
│   └── api.ts
├── api/                # ④ Adapter:与后端通信的边界
│   ├── _base.ts        # fetch 封装
│   ├── document.ts
│   └── job.ts
├── hooks/              # ② Orchestration:跨组件的业务编排
│   ├── useApiPolling.ts
│   └── useParseJob.ts
├── components/         # UI 层
│   └── Step3Parse/
│       ├── index.tsx           # 容器(状态 + 编排)
│       ├── ScanAnimation.tsx   # 纯 UI(玻璃罩 + 扫描)
│       └── StageProgress.tsx   # 纯 UI(阶段联动)
└── domain/             # ① Domain:业务规则与领域模型
    └── parseStage.ts   # ParseStage 类型 + 状态转移规则
```

---

## 第六部分:评审清单

新版评审清单按架构特性组织,与第 1.2 节优先级对齐:

### 可维护性检查
- [ ] 函数 ≤ 30 行,圈复杂度 ≤ 8
- [ ] 命名使用业务语言,无谜语缩写
- [ ] 注释只解释 why,无语法注释
- [ ] 模块归属四象限明确,依赖方向正确

### 可演进性检查
- [ ] 新增分支 ≥ 3 时已考虑策略/工厂
- [ ] 状态有唯一权威所有者
- [ ] 重要决策有对应 ADR
- [ ] 没有"长得像但定义在两处"的重复知识

### 可测试性检查
- [ ] Domain 层无 I/O,可纯单元测试
- [ ] Adapter 层有清晰接口,可被 mock
- [ ] 异步逻辑有显式取消机制
- [ ] 关键纯函数已有单元测试

### 可观测性检查
- [ ] 关键流程有结构化日志(非 `console.log("here")`)
- [ ] 错误有 code、message、retryable 三件套
- [ ] 长任务有进度上报

### 红线检查
- [ ] 没有空 catch
- [ ] 没有 mock 数据混入生产代码路径
- [ ] 没有隐藏的全局状态依赖
- [ ] 没有"看起来成功实际失败"的伪响应

---

## 第七部分:基线的演进机制

本基线本身也是一份"代码"。按照可演进性原则,它必须有自己的迭代机制:

| 触发条件 | 动作 |
|---|---|
| 出现一类新型的 bug 反复发生 | 提炼成新规则,加入对应章节 |
| 某条规则连续 3 次被合理违反 | 重新评估该规则的成本/收益 |
| 引入新技术栈(如新框架) | 增加该栈的具体投影章节 |
| 季度回顾 | 全文 review,过期内容标记 Deprecated |

**版本约定:**
- 主版本号(v2 → v3)代表哲学变化
- 次版本号(v2.0 → v2.1)代表规则增删
- 补丁号代表表述优化

**修改流程:** 任何对本基线的修改必须走 ADR 流程,且在 git 提交信息中注明 `baseline:` 前缀。

---

## 附录:与 v1.0 的核心差异

| 维度 | v1.0 | v2.0 |
|---|---|---|
| 组织逻辑 | 原则清单(SRP、DRY、KISS...) | 架构特性优先级 → 思维 → 实现 → 决策 → 投影 |
| 决策机制 | 隐式 | 显式 ADR |
| 权衡表达 | 无 | 每条规则注明放弃了什么 |
| 项目投影 | 通用 | 通用基线 + paper-formatter 专属落地 |
| 演进机制 | 无 | 第七部分专门定义 |
| 评审清单 | 按原则分类 | 按架构特性分类(与目的对齐) |
| 防御性编程 | "永远防御" | 明确边界:跨进程必防、内部不噪 |
| 错误处理 | 描述性 | 强制契约(后端响应 + 前端 Result) |

---

**版本信息**
- 版本号:v2.0.0
- 状态:Accepted
- 起草日期:2026-05-09
- 维护人:Wanghao
- 上一版本:[coding-baseline.md (v1.0)](./coding-baseline.md)
- 下次回顾:2026-08-09(季度回顾)
