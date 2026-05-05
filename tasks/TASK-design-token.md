# TASK-003: Read Design Tokens

## 描述
读取 VIB 设计系统的 Token 值。

## 输入
```json
{
  "category": "colors"
}
```

## 成功标准
- 输出包含 `--vib-` 前缀的 Token
- 按类别返回正确的 Token 集
- 响应时间 < 5s

## 评估方法
```bash
npm run dev once "读取 VIB 设计系统的颜色 Token"
```
