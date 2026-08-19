# 应用说明

## 直接放置(新增文件,解压即就位)
本包内 staging/paper-formatter/ 下除 docs/patch-*.ts 外,均可直接覆盖到你的仓库同路径。

## 需手动应用的改动(docs/patch-*.ts 是改动说明,非新文件)
- patch-1-priority.ts  → 整文件替换 services/api-gateway/src/rules/priority.ts
- patch-2-canonical-rule-map.ts → 按注释在 canonical-rule-map.ts 追加映射
- patch-3-analyze-job-runner.ts → 按注释改 analyze-job-runner.ts

## 合入顺序与验收
见 docs/INTEGRATION-CHECKLIST.md(阶段 A→D,每步可验证)。

## 本地提交(在你的仓库根目录)
git checkout -b feat/stem-discipline-support
cp -r <解压路径>/paper-formatter/* ./paper-formatter/
# 手动应用 docs/patch-*.ts 三处改动
cd paper-formatter/services/docx-parser && python3 tests/test_parse_enrich.py  # 验收 A
git add -A && git commit -m "feat: 理工科学科适配链路(公式/三线表/参考文献字段级校验)"
git push -u origin feat/stem-discipline-support
