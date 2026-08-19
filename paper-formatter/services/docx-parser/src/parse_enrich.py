#!/usr/bin/env python3
from __future__ import annotations
"""
docx-parser 解析增强模块(企业级,非 demo)。

补齐学科 detector 依赖的四类上游字段,全部为「纯增量」:
  1. 公式对象          → structure 中追加 type="formula" 条目 + 段落 has_formula 标记
  2. 三线表判定        → tables[].is_three_line + tables[].borders 明细
  3. 图片 dpi/格式     → images[].dpi + images[].format + images[].is_vector
  4. run 上下标        → paragraphs[].runs[].subscript / superscript

设计原则(生产标准):
  - 不修改现有 schema,只追加字段。既有 detector 与前端零影响。
  - 全部 XML 访问包裹异常,任何单元素解析失败不影响整篇(fail-soft)。
  - 命名空间、单位换算、字段命名风格与 parse.py 现有约定一致。
  - 每个函数纯函数化,可独立单测(见 test_parse_enrich.py)。
  - 公式 structure 条目的 type 用 "formula",与 discipline.detectors.ts 的
    getFormulaItems(type in {formula,equation,omml})对齐。
  - 参考文献条目类型对齐说明见文末 NOTE。

挂接方式见文末 INTEGRATION。
"""

from docx.oxml.ns import qn
from docx.shared import Emu

# OOXML Math 命名空间前缀(python-docx 的 qn 不含 m: ,需显式注册式访问)
_MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math"
_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
_A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"

# 矢量图扩展名(不判分辨率)
_VECTOR_EXT = {"emf", "wmf", "svg", "eps", "pdf"}
# 位图最低印刷分辨率阈值(可由 profile 覆盖)
_DEFAULT_MIN_DPI = 300


def _ln(tag: str) -> str:
    """返回 XML 标签的 local name(去命名空间)。与 parse.py._local_name 同义,独立以便单测。"""
    return tag.split("}", 1)[1] if "}" in tag else tag


# ──────────────────────────────────────────────────────────────────────────
# 1. 公式对象解析
# ──────────────────────────────────────────────────────────────────────────
def _iter_math_nodes(paragraph):
    """产出段落内的 OMML 公式根节点(oMath / oMathPara)。fail-soft。"""
    try:
        el = paragraph._element
    except Exception:
        return
    for node in el.iter():
        if _ln(node.tag) in ("oMath", "oMathPara"):
            yield node


def _extract_math_text(math_node) -> str:
    """抽取公式内的可见文本(m:t 节点拼接),用于编号识别与片段展示。"""
    parts = []
    try:
        for t in math_node.iter():
            if _ln(t.tag) == "t" and t.text:
                parts.append(t.text)
    except Exception:
        pass
    return "".join(parts).strip()


def _trailing_number_text(paragraph) -> str:
    """
    取段落尾部非公式文本(常为公式编号,如 (3-1))。
    OMML 公式后的编号通常是普通 run,不在 oMath 内。
    """
    try:
        text = paragraph.text or ""
    except Exception:
        return ""
    return text.strip()


def extract_formulas(doc) -> list[dict]:
    """
    扫描全文段落,产出公式对象列表。每个公式一条:
      {
        "type": "formula",          # 与 detector getFormulaItems 对齐
        "index": <段落索引>,
        "text": <公式可见文本>,
        "numbering": <所在段落全文,含可能的编号>,
        "is_display": <bool 是否独立成段>,
      }
    """
    formulas = []
    try:
        paragraphs = doc.paragraphs
    except Exception:
        return formulas
    for i, para in enumerate(paragraphs):
        math_nodes = list(_iter_math_nodes(para))
        if not math_nodes:
            continue
        para_text = _trailing_number_text(para)
        math_text = " ".join(_extract_math_text(m) for m in math_nodes).strip()
        # 独立公式判定:段落去掉公式文本后基本只剩编号/空白
        residual = para_text.replace(math_text, "").strip()
        is_display = len(residual) <= 12  # 残留很短 → 视为独立公式(可能含编号)
        formulas.append({
            "type": "formula",
            "index": i,
            "text": math_text or para_text,
            "numbering": para_text,
            "is_display": bool(is_display),
        })
    return formulas


def mark_paragraph_formulas(paragraphs: list[dict], formulas: list[dict]) -> None:
    """在 paragraphs(已序列化的 dict 列表)上原位标记 has_formula。纯增量。"""
    idx_with_formula = {f["index"] for f in formulas}
    for p in paragraphs:
        p["has_formula"] = p.get("index") in idx_with_formula


# ──────────────────────────────────────────────────────────────────────────
# 2. 三线表判定
# ──────────────────────────────────────────────────────────────────────────
def _border_val(borders_el, name: str) -> str:
    """读 tblBorders 下某条边(top/bottom/left/right/insideH/insideV)的 w:val。"""
    if borders_el is None:
        return ""
    child = borders_el.find(qn(f"w:{name}"))
    if child is None:
        return ""
    return child.get(qn("w:val")) or ""


def _table_borders(table) -> dict | None:
    """
    读取表格级 tblBorders。返回各边 val;无边框信息返回 None(不可判定)。
    """
    try:
        tblPr = table._element.tblPr
    except Exception:
        return None
    if tblPr is None:
        return None
    borders = tblPr.find(qn("w:tblBorders"))
    if borders is None:
        return None
    return {
        "top": _border_val(borders, "top"),
        "bottom": _border_val(borders, "bottom"),
        "left": _border_val(borders, "left"),
        "right": _border_val(borders, "right"),
        "insideH": _border_val(borders, "insideH"),
        "insideV": _border_val(borders, "insideV"),
    }


def _is_none_border(val: str) -> bool:
    return val in ("", "none", "nil")


def classify_three_line(table) -> tuple[bool | None, dict | None]:
    """
    判定三线表。返回 (is_three_line, borders)。
      is_three_line = True   仅顶/底/栏目线,无竖线、无内部横线
      is_three_line = False  含竖线或多余内部横线
      is_three_line = None   无边框信息,不可判定(detector 会跳过,防误报)
    注意:表格级无 insideV 不代表单元格级无竖线;此处为表格级判定,
    单元格级覆盖留待 P1 增强(见 NOTE)。
    """
    borders = _table_borders(table)
    if borders is None:
        return None, None
    has_vertical = not _is_none_border(borders["insideV"])
    has_inside_h = not _is_none_border(borders["insideH"])
    is_three = (not has_vertical) and (not has_inside_h)
    return is_three, borders


def enrich_tables(doc, tables: list[dict]) -> None:
    """在 tables(dict 列表)上原位追加 is_three_line + borders。纯增量。"""
    try:
        doc_tables = doc.tables
    except Exception:
        return
    for ti, tbl in enumerate(tables):
        if ti >= len(doc_tables):
            break
        try:
            is_three, borders = classify_three_line(doc_tables[ti])
        except Exception:
            is_three, borders = None, None
        tbl["is_three_line"] = is_three
        tbl["borders"] = borders


# ──────────────────────────────────────────────────────────────────────────
# 3. 图片 dpi / 格式
# ──────────────────────────────────────────────────────────────────────────
def _image_part_for_blip(doc, blip_el):
    """通过 r:embed 关系 id 找到图片 part,返回 (part, ext)。fail-soft。"""
    rid = blip_el.get(qn("r:embed")) or blip_el.get(qn("r:link"))
    if not rid:
        return None, ""
    try:
        part = doc.part.related_parts.get(rid)
    except Exception:
        return None, ""
    if part is None:
        return None, ""
    ext = ""
    try:
        ext = (part.partname.ext or "").lower().lstrip(".")
    except Exception:
        ext = ""
    return part, ext


def _native_px_size(part) -> tuple[int, int]:
    """从图片字节读取原生像素尺寸。仅依赖标准库,支持 PNG/JPEG/GIF。"""
    try:
        blob = part.blob
    except Exception:
        return 0, 0
    if not blob or len(blob) < 24:
        return 0, 0
    # PNG
    if blob[:8] == b"\x89PNG\r\n\x1a\n":
        try:
            w = int.from_bytes(blob[16:20], "big")
            h = int.from_bytes(blob[20:24], "big")
            return w, h
        except Exception:
            return 0, 0
    # GIF
    if blob[:6] in (b"GIF87a", b"GIF89a"):
        try:
            w = int.from_bytes(blob[6:8], "little")
            h = int.from_bytes(blob[8:10], "little")
            return w, h
        except Exception:
            return 0, 0
    # JPEG: 扫描 SOF 标记
    if blob[:2] == b"\xff\xd8":
        try:
            i = 2
            n = len(blob)
            while i < n - 9:
                if blob[i] != 0xFF:
                    i += 1
                    continue
                marker = blob[i + 1]
                if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
                    h = int.from_bytes(blob[i + 5:i + 7], "big")
                    w = int.from_bytes(blob[i + 7:i + 9], "big")
                    return w, h
                seg_len = int.from_bytes(blob[i + 2:i + 4], "big")
                i += 2 + seg_len
        except Exception:
            return 0, 0
    return 0, 0


def compute_image_dpi(doc, run_element, display_w_pt: float, display_h_pt: float) -> dict:
    """
    计算图片有效 dpi = 原生像素 / 显示英寸。
    display_*_pt 来自现有 extract_images 的 width_pt/height_pt(72pt=1in)。
    返回 {dpi, format, is_vector, native_px}。无法判定的字段给 0/""。
    """
    out = {"dpi": 0, "format": "", "is_vector": False, "native_px": [0, 0]}
    try:
        blip = None
        for node in run_element.iter():
            if _ln(node.tag) == "blip":
                blip = node
                break
        if blip is None:
            return out
        part, ext = _image_part_for_blip(doc, blip)
        out["format"] = ext
        if ext in _VECTOR_EXT:
            out["is_vector"] = True
            return out
        if part is None:
            return out
        px_w, px_h = _native_px_size(part)
        out["native_px"] = [px_w, px_h]
        in_w = display_w_pt / 72.0 if display_w_pt else 0
        in_h = display_h_pt / 72.0 if display_h_pt else 0
        dpi_w = px_w / in_w if in_w > 0 and px_w > 0 else 0
        dpi_h = px_h / in_h if in_h > 0 and px_h > 0 else 0
        dpis = [d for d in (dpi_w, dpi_h) if d > 0]
        out["dpi"] = round(min(dpis), 0) if dpis else 0
    except Exception:
        return out
    return out


def enrich_images(doc, images: list[dict]) -> None:
    """
    在 images(dict 列表)上原位追加 dpi/format/is_vector/native_px。
    依据 paragraph_index 回到原 run 取 blip。纯增量、fail-soft。
    """
    try:
        paragraphs = doc.paragraphs
    except Exception:
        return
    # 按段落索引归集图片记录,逐段匹配 drawing run
    by_para: dict[int, list[dict]] = {}
    for img in images:
        by_para.setdefault(img.get("paragraph_index", -1), []).append(img)

    for pi, recs in by_para.items():
        if pi < 0 or pi >= len(paragraphs):
            continue
        # 收集该段所有含 blip 的 run element,按顺序与 recs 对齐
        run_elements = []
        try:
            for run in paragraphs[pi].runs:
                if run._element.findall(qn("w:drawing")):
                    run_elements.append(run._element)
        except Exception:
            run_elements = []
        for idx, rec in enumerate(recs):
            run_el = run_elements[idx] if idx < len(run_elements) else None
            if run_el is None:
                rec.update({"dpi": 0, "format": "", "is_vector": False, "native_px": [0, 0]})
                continue
            info = compute_image_dpi(
                doc, run_el,
                rec.get("width_pt", 0) or 0,
                rec.get("height_pt", 0) or 0,
            )
            rec.update(info)


# ──────────────────────────────────────────────────────────────────────────
# 4. run 上下标
# ──────────────────────────────────────────────────────────────────────────
def _run_vert_align(run) -> tuple[bool, bool]:
    """读 run 的 w:vertAlign(subscript / superscript)。返回 (sub, sup)。"""
    try:
        rPr = run._element.rPr
    except Exception:
        return False, False
    if rPr is None:
        return False, False
    va = rPr.find(qn("w:vertAlign"))
    if va is None:
        return False, False
    val = va.get(qn("w:val")) or ""
    return val == "subscript", val == "superscript"


def enrich_paragraph_runs(doc, paragraphs: list[dict]) -> None:
    """
    在 paragraphs[].runs[] 上原位追加 subscript/superscript。纯增量。
    依赖 run 顺序与 extract_paragraphs 序列化时一致(均来自 para.runs)。
    """
    try:
        doc_paras = doc.paragraphs
    except Exception:
        return
    for p in paragraphs:
        pi = p.get("index", -1)
        if pi < 0 or pi >= len(doc_paras):
            continue
        runs_meta = p.get("runs", [])
        try:
            doc_runs = doc_paras[pi].runs
        except Exception:
            continue
        for ri, rmeta in enumerate(runs_meta):
            if ri >= len(doc_runs):
                break
            sub, sup = _run_vert_align(doc_runs[ri])
            rmeta["subscript"] = sub
            rmeta["superscript"] = sup


# ──────────────────────────────────────────────────────────────────────────
# 统一入口
# ──────────────────────────────────────────────────────────────────────────
def enrich_parse_result(doc, result: dict) -> dict:
    """
    在 parse_docx 的 result 上做全部四项增强。原位修改并返回。
    调用点:parse_docx() 内 result 组装完成、return 之前。
    """
    paragraphs = result.get("paragraphs", [])
    tables = result.get("tables", [])
    images = result.get("images", [])
    structure = result.get("structure", [])

    # 1. 公式
    formulas = extract_formulas(doc)
    mark_paragraph_formulas(paragraphs, formulas)
    if formulas:
        structure.extend(formulas)  # structure 列表追加 type="formula" 条目
        result["structure"] = structure

    # 2. 三线表
    enrich_tables(doc, tables)

    # 3. 图片 dpi
    enrich_images(doc, images)

    # 4. 上下标
    enrich_paragraph_runs(doc, paragraphs)

    return result


# ──────────────────────────────────────────────────────────────────────────
# INTEGRATION(挂接说明)
# ──────────────────────────────────────────────────────────────────────────
# parse.py 顶部 import:
#     from parse_enrich import enrich_parse_result
# parse_docx() 内,result 组装完成、return result 之前加一行:
#     result = enrich_parse_result(doc, result)
#
# NOTE · 字段对齐(必须同步修正,否则 detector 拿不到数据):
#   (a) discipline.detectors.ts 里三处用 type === "reference_entry",
#       而本解析器 detect_structure 产出的是 "reference"。二选一对齐:
#       建议改 detector 端:type in {"reference","reference_entry"}。
#   (b) detector 读 table.isThreeLine(驼峰),本模块输出 is_three_line(下划线)。
#       若 API 层 ParsedDocumentContext 不做 camelCase 转换,需在 detector 端
#       同时兼容:t?.isThreeLine ?? t?.is_three_line。
#       (本仓库 Python→TS 边界惯例需确认;两端命名风格不同是真实风险点。)
#   (c) 图片 detector 读 img.dpi / img.format,与本模块输出一致,无需改。
#   (d) run 读 r.subscript / r.superscript,与本模块输出一致,无需改。
#
# 单元格级竖线(P1 增强):本模块仅判表格级 tblBorders。若文档用单元格级
#   tcBorders 画竖线而表格级声明 none,会漏判。生产环境建议补一轮单元格扫描,
#   命中任一 tcBorders.left/right 非 none 即推翻 is_three_line=True。
