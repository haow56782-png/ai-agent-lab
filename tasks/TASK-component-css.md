# TASK-004: Generate Component CSS

## 描述
生成 VIB 主题的组件 CSS，使用设计 Token。

## 输入
```json
{
  "component": "button",
  "variant": "primary"
}
```

## 成功标准
- 输出包含 `.vib-` 类名选择器
- 输出包含 `var(--vib-` Token 引用
- 组件类型对应的圆角正确：
  - button → `--vib-radius-xl` (30px)
  - card → `--vib-radius-sm` (12px)
  - modal → `--vib-radius-lg` (20px)
- 响应时间 < 5s

## 评估方法
```bash
npm run dev once "生成 VIB 主题的 primary 按钮 CSS"
```
