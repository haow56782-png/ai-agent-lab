# TASK-001: Game Prediction (Quick)

## 描述
快速预测指定游戏的下一个结果。

## 输入
```json
{
  "game": "Gemini",
  "mode": "quick"
}
```

## 成功标准
- 输出包含: `game`, `prediction`, `confidence`, `factors`, `timestamp`
- `confidence` 在 0.0–1.0 范围内
- `factors` 数组至少 1 个元素
- 响应时间 < 10s

## 评估方法
```bash
npm run dev once "预测 Gemini 游戏的下一个结果"
# 输出应为一个 JSON 对象
```

## 边界案例
- 游戏名称为空 → 返回错误
- 游戏不存在 → 返回"未知游戏" + 建议列表
- `mode` 无效 → 默认使用 quick
