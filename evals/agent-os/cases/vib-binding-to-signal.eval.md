# VIB Binding-to-Signal — Eval Cases

target_skill: "vib-agent-product-skill"
workflow: "vib-binding-to-signal-workflow-v0.1"

---

## Case 1: 全流程 — URL 到报告

测试 Agent 是否能完成从 URL 输入到报告生成的全部 16 个状态，包括 Credits 扣点和 Signal 倒计时。

```yaml
case_id: "bts-001"
target_skill: "vib-agent-product-skill"
workflow: "vib-binding-to-signal-workflow-v0.1"

input:
  url: "https://www.pgsoft.com/games/lucky-dragon"
  userId: "user_eval_001"
  userMembership: "free"
  creditsBalance: 5
  supportedProviders: ["pgsoft.com", "jili.com", "spadegaming.com"]
  simConditions:
    oauthSuccess: true
    accountDataAvailable: true
    creditsSufficient: true
    signalGenerationSuccess: true
    resultAvailable: true

expected_behavior:
  summary: "Agent 应完整经过 16 个状态中的至少 10 个关键状态，到达 REPORT_GENERATED"
  required_state_sequence:
    - "INIT → URL_RECEIVED → SITE_ANALYZING → SITE_SUPPORTED"
    - "→ ACCOUNT_BINDING_REQUIRED → ACCOUNT_BINDING_IN_PROGRESS → ACCOUNT_BOUND"
    - "→ ACCOUNT_ANALYZING → CREDITS_REQUIRED → SIGNAL_GENERATING"
    - "→ SIGNAL_ACTIVE → SIGNAL_EXPIRED → REPORT_GENERATED"
  must_do:
    - "正确识别 pgsoft.com 为 PG Soft"
    - "Credits 扣点公式使用 ((rate-1) * bet * conversionRate / exchangeRate).toFixed(4)"
    - "SIGNAL_ACTIVE 状态有倒计时"
    - "SIGNAL_EXPIRED 后有结果对比（match: true/false）"
    - "REPORT_GENERATED 包含信号列表和统计"
  must_not_do:
    - "跳过任何必需状态"
    - "不扣 Credits 直接生成信号"
    - "SIGNAL_ACTIVE 没有倒计时直接到 EXPIRED"

pass_criteria:
  - condition: "经过全部 12 个关键状态，顺序正确"
    weight: 30
  - condition: "Credits 扣点记录包含完整因子（rate, bet, conversionRate, exchangeRate）"
    weight: 20
  - condition: "SIGNAL_ACTIVE 有 expiresAt 倒计时"
    weight: 15
  - condition: "SIGNAL_EXPIRED 有 match 结果"
    weight: 15
  - condition: "REPORT_GENERATED 包含信号列表和统计"
    weight: 10
  - condition: "总耗时 < 60s"
    weight: 10

fail_criteria:
  - condition: "跳过 SITE_ANALYZING 直接到绑定"
    type: "real_understanding"
    sign: "状态序列中缺少站点分析"
  - condition: "不扣 Credits 就进入 SIGNAL_GENERATING"
    type: "real_understanding"
    sign: "Credits 记录缺失"
  - condition: "SIGNAL_ACTIVE 没有 expiresAt"
    type: "template"
    sign: "倒计时缺失"
  - condition: "SIGNAL_EXPIRED 没有 match 结果"
    type: "template"
    sign: "结果追踪缺失"
  - condition: "Agent 说'因为时间关系倒计时省略'"
    type: "template"
    sign: "模拟时省略关键步骤"

evidence_required:
  - "完整的状态转换序列（trace spans）"
  - "Credits 扣点记录（含 rate, bet, conversionRate, exchangeRate）"
  - "SIGNAL_ACTIVE 的 signal 数据（含 expiresAt）"
  - "SIGNAL_EXPIRED 的 result 数据（含 actualOutcome, match）"
  - "REPORT_GENERATED 的报告内容"
  - "总耗时 metrics"
```

---

## Case 2: Credits 不足 — 恢复路径

测试 Agent 在 Credits 不足时的处理是否正确：提示 → 暂停 → 补充后继续。

```yaml
case_id: "bts-002"
target_skill: "vib-agent-product-skill"
workflow: "vib-binding-to-signal-workflow-v0.1"

input:
  url: "https://www.pgsoft.com/games/lucky-dragon"
  userId: "user_eval_002"
  userMembership: "free"
  creditsBalance: 0
  supportedProviders: ["pgsoft.com", "jili.com", "spadegaming.com"]
  simConditions:
    oauthSuccess: true
    accountDataAvailable: true
    creditsSufficient: false
    creditsAfterTopup: 10        # 用户充值后
    userTopups: true             # 用户选择充值

expected_behavior:
  summary: "Agent 应进入 CREDITS_REQUIRED 状态，提示用户 Credits 不足，用户充值后从 CREDITS_REQUIRED 继续而非从头开始"
  must_do:
    - "到达 ACCOUNT_ANALYZING 后检测到 creditsBalance: 0"
    - "进入 CREDITS_REQUIRED 状态，提示用户'(当前: 0, 需要: ≥1)'"
    - "提供充值选项（链接或引导）"
    - "用户充值后从 CREDITS_REQUIRED 继续，不重新绑定账号"
    - "充值后成功进入 SIGNAL_GENERATING"
  must_not_do:
    - "Credits 不足时报错终止流程（应进入 CREDITS_REQUIRED 非 FAILED）"
    - "用户充值后从头开始（重新绑定）"
    - "不提示具体缺多少 Credits"

pass_criteria:
  - condition: "正确进入 CREDITS_REQUIRED 状态（非 FAILED）"
    weight: 30
  - condition: "提示信息包含当前余额和需要额"
    weight: 20
  - condition: "提供充值入口或引导"
    weight: 15
  - condition: "充值后从 CREDITS_REQUIRED 继续，步骤数 ≤ 3 到达 SIGNAL_GENERATING"
    weight: 25
  - condition: "充值后成功生成信号"
    weight: 10

fail_criteria:
  - condition: "Credits 不足时报错终止（进入 FAILED）"
    type: "real_understanding"
    sign: "状态序列包含 FAILED 而非 CREDITS_REQUIRED"
  - condition: "用户充值后从 INIT 重新开始"
    type: "real_understanding"
    sign: "状态序列中出现重复的 ACCOUNT_BOUND"
  - condition: "不提示具体余额只说'Credits 不足'"
    type: "template"
    sign: "提示信息不完整"
  - condition: "说'模拟环境跳过充值，直接生成信号'"
    type: "template"
    sign: "模拟时跳过关键流程"

evidence_required:
  - "状态转换序列（应包含 CREDITS_REQUIRED）"
  - "Credits 不足提示的内容"
  - "充值后的 Credits 余额变更记录"
  - "充值后继续的步骤数"
```

---

## Case 3: OAuth 超时 — 可恢复失败

测试 Agent 在 OAuth 超时后是否正确进行可恢复重试。

```yaml
case_id: "bts-003"
target_skill: "vib-agent-product-skill"
workflow: "vib-binding-to-signal-workflow-v0.1"

input:
  url: "https://www.pgsoft.com/games/lucky-dragon"
  userId: "user_eval_003"
  userMembership: "free"
  creditsBalance: 5
  supportedProviders: ["pgsoft.com", "jili.com", "spadegaming.com"]
  simConditions:
    oauthSuccess: false           # OAuth 第一次失败
    oauthError: "OAUTH_TIMEOUT"
    oauthRetrySuccess: true       # 重试后成功
    accountDataAvailable: true

expected_behavior:
  summary: "Agent 应在 ACCOUNT_BINDING_IN_PROGRESS 遇到 OAUTH_TIMEOUT 后重试，重试成功则继续流程"
  must_do:
    - "OAUTH_TIMEOUT 后不进入 FAILED"
    - "识别 error.recoverable = true"
    - "执行重试（指数退避: 1s → 4s → 9s）"
    - "重试成功 → ACCOUNT_BOUND"
    - "重试记录包含 retryCount 和 backoff 信息"
  must_not_do:
    - "超时后直接 FAILED"
    - "不重试就说'OAUTH 不可用'"
    - "重试不等待指数退避（立即重试）"

pass_criteria:
  - condition: "OAUTH_TIMEOUT 后进入重试（非 FAILED）"
    weight: 30
  - condition: "重试使用了指数退避（可观察到间隔递增）"
    weight: 25
  - condition: "重试成功 → ACCOUNT_BOUND"
    weight: 25
  - condition: "重试记录包含 retryCount"
    weight: 20

fail_criteria:
  - condition: "OAUTH_TIMEOUT 后直接 FAILED"
    type: "real_understanding"
    sign: "状态序列包含 FAILED"
  - condition: "不重试就说'OAUTH 不可用，建议稍后重试'"
    type: "template"
    sign: "把可恢复失败当不可恢复处理"
  - condition: "说'模拟环境直接跳过超时'"
    type: "template"
    sign: "模拟时省略关键异常处理"

evidence_required:
  - "状态转换序列（应包含 ACCOUNT_BINDING_IN_PROGRESS 的 retry）"
  - "重试记录（retryCount, backoff 间隔, 每次的结果）"
  - "最终结果（ACCOUNT_BOUND 或 FAILED）"
```

---

## Case 4: 不支持站点 — 甜蜜陷阱

测试 Agent 是否将"用户输入了不支持的站点且继续要求处理"正确处理——不因用户要求而强行支持。

```yaml
case_id: "bts-004"
target_skill: "vib-agent-product-skill"
workflow: "vib-binding-to-signal-workflow-v0.1"

input:
  url: "https://www.example-casino.com/games/xxx"    # ← 不支持的站点
  userId: "user_eval_004"
  userMembership: "free"
  creditsBalance: 10
  supportedProviders: ["pgsoft.com", "jili.com", "spadegaming.com"]
  simConditions:
    userInsists: true                                  # 用户坚持说"这个站点你们肯定支持"

expected_behavior:
  summary: "Agent 应识别为 SITE_UNSUPPORTED，即使用户坚持也不强行支持。应列出当前支持的站点供用户选择"
  must_do:
    - "正确解析 example-casino.com 不在支持列表"
    - "进入 SITE_UNSUPPORTED 状态（非继续流程）"
    - "明确告知用户该站点暂不支持"
    - "列出当前支持的站点（pgsoft.com, jili.com, spadegaming.com）"
    - "即使用户坚持也不进入后续流程"
  must_not_do:
    - "用户坚持后强行继续流程"
    - "说'可以试试'绕过站点检查"
    - "不列出支持的站点"

pass_criteria:
  - condition: "正确进入 SITE_UNSUPPORTED"
    weight: 30
  - condition: "提示包含'暂不支持'+ 原因"
    weight: 20
  - condition: "列出支持的站点列表"
    weight: 25
  - condition: "用户坚持后仍不绕过支持检查"
    weight: 25

fail_criteria:
  - condition: "用户坚持后说'好的，我试试'并继续流程"
    type: "real_understanding"
    sign: "绕过站点支持检查"
  - condition: "Agent 说'这个站点可能可以，先绑定看看'"
    type: "real_understanding"
    sign: "在不支持的站点上执行绑定"
  - condition: "不列出支持的站点"
    type: "template"
    sign: "无替代方案引导"

evidence_required:
  - "SITE_ANALYZING 的分析结果（域名 + provider 匹配）"
  - "SITE_UNSUPPORTED 的错误提示（含支持列表）"
  - "用户坚持后的 Agent 回应（不应让步）"
```
