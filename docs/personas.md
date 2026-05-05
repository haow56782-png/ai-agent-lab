# VIB AI Agent — User Personas

## Persona 1: 游戏数据分析师

| | |
|---|---|
| **Name** | 小王 |
| **Role** | 游戏数据分析师 |
| **Background** | 熟悉 SQL/Python，但非 ML 专家 |
| **Goal** | 快速分析游戏历史数据，输出预测报告 |
| **Pain Points** | 手动跑数据太慢；ML 模型部署周期长 |
| **How VIB helps** | 自然语言描述需求，Agent 自动规划、执行、输出 |

### Typical Session
```
小王: 分析 PG Soft 最近 7 天的 Gem Saviour 数据
Agent: → 调用 game-metrics tool → 分析趋势 → 输出报告
小王: 预测下一小时的概率分布
Agent: → 调用 predict tool → 输出置信度 + 因子分析
```

## Persona 2: 设计工程师

| | |
|---|---|
| **Name** | Linda |
| **Role** | 设计工程师 |
| **Background** | 熟悉 Figma + CSS，用 Claude Code 做设计实现 |
| **Goal** | 从 Figma 设计到代码的高效转换 |
| **Pain Points** | Token 手动同步容易出错；组件变体太多 |
| **How VIB helps** | Figma API 直连 → 自动提取 Token → 生成组件 CSS |

## Persona 3: AI Agent 开发者

| | |
|---|---|
| **Name** | Alex |
| **Role** | AI Agent 开发者 |
| **Background** | 熟悉 LLM + Agent 架构 |
| **Goal** | 扩展 VIB Agent 的能力边界 |
| **Pain Points** | 缺乏评测标准；不知道新 Skill 是否有效 |
| **How VIB helps** | Task Catalog + Evaluation Framework 让能力可量化 |
