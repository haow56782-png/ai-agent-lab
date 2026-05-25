# redesign-v2 Implementation Checklist

基于 [README.md](/Users/linda/ai-agent-lab/paper-formatter/docs/redesign-v2/README.md:1) 的落地建议整理，目标是把 `redesign-v2` 拆成可按批次推进、可验收、可测试的实现任务。

## P0 · Step4Fix 优先

- [ ] 1. Step4Fix 布局骨架重构
  - 目标：改成“左稿纸地图 / 中央红笔标注 / 右 cockpit 三联 / 底部时间线 scrubber”。
  - 主要文件：
    - [Step4Fix.tsx](/Users/linda/ai-agent-lab/paper-formatter/services/client/src/screens/Step4Fix.tsx:1)
    - [useFixFlowController.ts](/Users/linda/ai-agent-lab/paper-formatter/services/client/src/screens/step4-fix/useFixFlowController.ts:1)
    - [useFixPlayback.ts](/Users/linda/ai-agent-lab/paper-formatter/services/client/src/screens/step4-fix/useFixPlayback.ts:1)
  - 验收：
    - 页面信息、剩余时间、动作计数继续同源推进
    - 不改现有 fix job 业务状态机
    - 现有 Step4 测试不回退

- [ ] 2. Step4Fix 中央稿纸地图组件化
  - 目标：把 A4 修复现场拆成独立画布组件，支持页码定位、红笔批注层、焦点 finding 高亮。
  - 建议新增：
    - `services/client/src/screens/step4-fix/PaperMap.tsx`
    - `services/client/src/screens/step4-fix/MarkupOverlay.tsx`
  - 验收：
    - 焦点切换时中央画布跟随
    - 与 playback 当前步骤联动
    - 不再把全部历史动作直接堆在中央画布里

- [ ] 3. Step4Fix 底部时间线 scrubber
  - 目标：把播放过程变成可拖动、可回看、可暂停的时间轴。
  - 主要文件：
    - [useFixPlayback.ts](/Users/linda/ai-agent-lab/paper-formatter/services/client/src/screens/step4-fix/useFixPlayback.ts:1)
  - 验收：
    - 支持拖动到任意动作节点
    - 当前页面、当前动作、右侧 cockpit 内容同步回放
    - 不破坏自动播放默认体验

- [ ] 4. Step4Fix 右侧 cockpit 三联
  - 目标：把“证据 → 规则 → 修改”做成稳定复用单元。
  - 建议新增：
    - `services/client/src/components/EvidenceRuleChangeTriptych.tsx`
  - 验收：
    - 右栏信息来自当前焦点 finding 或 action
    - 后续可在 Step3 dock 和 Step5 card 复用

## P1 · Step4Diff + Step5Output 校对台

- [ ] 5. 校对台单屏信息架构落地
  - 目标：把当前 `Step4Diff` + `Step5Output` 收成一个单屏 workbench。
  - 主要文件：
    - [Step4Diff.tsx](/Users/linda/ai-agent-lab/paper-formatter/services/client/src/screens/Step4Diff.tsx:1)
    - [Step5Output.tsx](/Users/linda/ai-agent-lab/paper-formatter/services/client/src/screens/Step5Output.tsx:1)
  - 验收：
    - finding 级确认、批量批准、下载守门都还能用
    - 不引入新的状态源

- [ ] 6. Step4DiffWorkbench 扩成校对台主工作面
  - 目标：接入 before/after 卡片、类别批量批准、sha256 证书区。
  - 主要文件：
    - [Step4DiffWorkbench.tsx](/Users/linda/ai-agent-lab/paper-formatter/services/client/src/screens/step4-diff/Step4DiffWorkbench.tsx:1)
    - [useStep4DownloadController.ts](/Users/linda/ai-agent-lab/paper-formatter/services/client/src/screens/step4-diff/useStep4DownloadController.ts:1)
  - 验收：
    - 下载按钮守门逻辑不改
    - 审核动作和完整性状态展示更集中
    - `finding_id` 焦点链路继续成立

- [ ] 7. Step5Output 内容拆成卡片层和证书层
  - 目标：输出页拆成“逐项变更卡片 + 提交质量证书 + 白/黑名单 chips”三块。
  - 验收：
    - `submission-quality-report` 信息继续展示
    - 完整性与下载限制保持一致
    - 不再把业务状态和大段展示 JSX 混在一个文件里

## P2 · Step3Parse 渐进接入

- [ ] 8. Step3Parse 右侧 dock 先行接入
  - 目标：先接“发现项实时入坞”，不先重写整页。
  - 主要文件：
    - [Step3Parse.tsx](/Users/linda/ai-agent-lab/paper-formatter/services/client/src/screens/Step3Parse.tsx:1)
  - 建议新增：
    - `services/client/src/screens/step3-parse/FindingsDock.tsx`
  - 验收：
    - 不改现有解析轮询主流程
    - 右侧 dock 可显示结构发现、进度、置信度
    - 为三联组件复用铺路

- [ ] 9. Step3Parse 中央视觉升级为“结构 X 光探针”
  - 目标：把中部扫描区升级成玻璃罩 + 扫描线 + 放大镜，但先只动视觉层。
  - 验收：
    - 不影响解析状态推进
    - 动画可降级
    - 移动端不崩

- [ ] 10. Step3Parse 大文件拆分
  - 目标：拆成 shell、scan stage、result dock、stage progress。
  - 验收：
    - route shell 明显变薄
    - 轮询、副作用、展示组件解耦
    - 与既有 client baseline 文档方向一致

## 横向任务

- [ ] 11. 设计 token 收口
  - 目标：把 `redesign-v2/tokens.css` 映射到客户端真实样式系统。
  - 建议新增：
    - `services/client/src/styles/redesign-v2.css` 或 token 模块
  - 验收：
    - Step3/4/5 共用颜色、阴影、纸张、红笔、玻璃罩 token

- [ ] 12. 三联组件复用矩阵
  - 目标：定义“证据 → 规则 → 修改”在 Step3 dock / Step4 cockpit / Step5 card 的 props contract。
  - 验收：
    - 只维护一套字段模型
    - 不再在三个页面各自拼相似文案

- [ ] 13. 验收测试补齐
  - 目标：把 redesign 的核心交互落到现有 client tests。
  - 优先补：
    - Step4 scrubber 同步
    - 校对台批量批准
    - Step3 dock 实时入坞
    - 三联组件焦点同步

## 推荐执行顺序

1. Step4Fix 骨架 + cockpit 三联
2. Step4Fix 时间线 scrubber
3. Step4Diff / Step5Output 单屏校对台
4. Step3Parse 右侧 dock
5. Step3Parse 中央视觉和拆分
6. token 收口与跨屏复用

## 里程碑建议

- M1：完成 P0，Step4Fix 从“动画页”升级为“工作台”
- M2：完成 P1，校对台单屏可用，下载守门逻辑保持稳定
- M3：完成 P2，Step3 右侧 dock 接入并开始拆大文件
- M4：完成横向任务，三屏统一视觉和组件 contract
