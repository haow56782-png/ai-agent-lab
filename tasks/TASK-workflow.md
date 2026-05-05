# TASK-005: Workflow (Plan→Execute→Review→Refine)

## 描述
对给定任务执行多步骤工作流：先规划、再执行、然后评审、最后根据评审优化。

## 输入
```json
{
  "task": "生成一个 VIB 主题的按钮组件 CSS，primary 变体"
}
```

## 成功标准
- 输出包含: `## Plan`, `## Output`, `## Review` 三个章节
- 如果评审发现问题，必须有 `## Refined` 章节
- 响应时间 < 60s

## 评估方法
```bash
npm run dev workflow "生成一个 VIB 主题的按钮组件 CSS"
```
