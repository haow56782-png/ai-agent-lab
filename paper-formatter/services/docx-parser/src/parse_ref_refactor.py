#!/usr/bin/env python3
"""
P0-d 重构 · 解析器侧:参考文献条目识别放宽 + 取消正文截断

根因(既有缺陷,非新引入):
  detect_structure() 的 reference_entry 分支有两处问题,导致字段级校验拿不到数据:
    1. 仅匹配 `^\[\d+`(方括号数字制),漏标 GB/T 7714 常见的 `1.` / `1 ` / `[1]` 之外形态。
    2. text[:120] 截断,卷期页码/DOI 被切掉,字段级校验无从校验。

重构原则:治本(改解析器产出),不是在 detector 里猜。

────────────────────────────────────────────────────────────────────────────
改动点:parse.py 的 detect_structure(),替换 reference_entry 分支(原第 121-128 行)。
────────────────────────────────────────────────────────────────────────────
"""

import re

# 文献条目起始形态(顺序编码制 GB/T 7714 的常见写法,按优先级):
#   [1]  / [1] xxx        方括号数字制
#   1.   / 1．            点号制(中英文句点)
#   1)   / (1)           括号制
#   ① ② ③               圈号(少数模板)
# 排除:纯页码、"图 1"、"表 1" 等(这些不以行首数字+分隔符构成文献编号)
_REF_ENTRY_PATTERNS = [
    re.compile(r'^\[\s*\d+\s*\]'),        # [1] [ 1 ]
    re.compile(r'^\d+\s*[.．]\s'),         # 1.  1．
    re.compile(r'^[(（]\s*\d+\s*[)）]'),    # (1) （1）
    re.compile(r'^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]'),  # 圈号
]


def looks_like_reference_entry(text: str) -> bool:
    """判断一行是否是参考文献条目起始。供 detect_structure 复用,可单测。"""
    t = (text or "").strip()
    if not t:
        return False
    # 至少要有一定长度,排除孤立编号行(如目录页码残留)
    if len(t) < 6:
        return False
    return any(p.match(t) for p in _REF_ENTRY_PATTERNS)


# ────────────────────────────────────────────────────────────────────────────
# 替换片段:把原 reference_entry 分支整体替换为下面这段。
# (保留 in_references 上下文不变,仅改匹配条件与不截断)
# ────────────────────────────────────────────────────────────────────────────
_REPLACEMENT_SNIPPET = '''
        # Reference entries —— 放宽识别(方括号/点号/括号/圈号制),且不截断正文,
        # 以便后续字段级校验(作者/卷期页码/DOI/类型标识)。
        if in_references and looks_like_reference_entry(text):
            append_structure({
                "index": i,
                "type": "reference_entry",
                "text": text,            # 不再 [:120] 截断
                "confidence": 0.8,
            })
            continue
'''


# ────────────────────────────────────────────────────────────────────────────
# 同时:detect_structure 顶部需能调用 looks_like_reference_entry。
# 两种合入方式任选:
#   (A) 把 _REF_ENTRY_PATTERNS + looks_like_reference_entry 复制进 parse.py 模块级;
#   (B) parse.py 顶部 from parse_ref_refactor import looks_like_reference_entry。
# 推荐 (A),保持 parse.py 自包含,减少部署期 import 风险。
# ────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # 自测识别器
    cases = [
        ("[1] 王浩. 风控系统设计[J]. 计算机学报, 2024, 47(3): 12-25.", True),
        ("1. Smith J. Deep Learning[M]. MIT Press, 2023.", True),
        ("(1) 李明. 区块链支付[D]. 清华大学, 2022.", True),
        ("① 张伟. 多模态评估[C]. ICML, 2025.", True),
        ("参考文献", False),       # header 不是 entry
        ("图 1 系统架构", False),   # 图题不是 entry
        ("12", False),            # 孤立页码
        ("", False),
    ]
    ok = 0
    for text, expected in cases:
        got = looks_like_reference_entry(text)
        flag = "✓" if got == expected else "✗"
        if got == expected:
            ok += 1
        print(f"{flag} {got!s:5} (期望 {expected!s:5}) <- {text[:40]}")
    print(f"\n{ok}/{len(cases)} 通过")
