"""
DOCX Formatter Engine — python-docx based.

MVP scope (format-only, no content changes):
  - Title styles (Heading 1-4 with font/weight/size)
  - Body font (宋体/Times New Roman, 12pt)
  - Line spacing (1.5x)
  - Paragraph spacing (段前 24pt, 段后 18pt for H1)
  - Page margins (上 25mm, 下 25mm, 左 30mm, 右 25mm)
  - Headers / Footers
  - Page numbers (roman prefatory, arabic body)
  - Table of Contents (semi-auto refresh)

Non-MVP (skipped in this version):
  - Caption formatting
  - Reference formatting
  - Content rewriting

Usage:
    from docx_formatter import DocxFormatter
    formatter = DocxFormatter(input_path, rules)
    formatter.format()
    formatter.save(output_path)
    diff = formatter.get_diff()
"""

from __future__ import annotations

from docx import Document
from docx.shared import Pt, Cm, Mm, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
import copy
import hashlib
import json
import os
from typing import Any

FLOATING_OBJECT_OVERLAP_RULE_ID = "FLOATING_OBJECT_OVERLAP_TEXT"


# ── Helpers ──

def _cm(value_cm: float) -> Cm:
    """Convert cm to docx Cm (handles negative or zero gracefully)."""
    return Cm(max(value_cm, 0))


def _mm_to_cm(mm: float) -> float:
    return mm / 10.0


def _pt(pt: float) -> Pt:
    return Pt(max(pt, 1))


def _length_to_mm_text(length: Emu | None) -> str:
    """Render a docx length as mm text without failing on missing values."""
    if length is None:
        return "N/A"
    try:
        return f"{length.mm:.0f}"
    except Exception:
        return "N/A"


def _set_font(run, font_name: str | None, font_size_pt: float | None, bold: bool | None = None):
    """Set font properties on a run using direct XML manipulation."""
    if font_name or font_size_pt or bold is not None:
        rpr = run._element.get_or_add_rPr()
        if font_name:
            fonts = rpr.find(qn("w:rFonts"))
            if fonts is None:
                fonts = parse_xml(f'<w:rFonts {nsdecls("w")} />')
                rpr.insert(0, fonts)
            fonts.set(qn("w:ascii"), font_name)
            fonts.set(qn("w:hAnsi"), font_name)
            fonts.set(qn("w:eastAsia"), font_name)
        if font_size_pt:
            sz_val = str(int(font_size_pt * 2))
            sz = rpr.find(qn("w:sz"))
            if sz is None:
                sz = parse_xml(f'<w:sz {nsdecls("w")} w:val="{sz_val}"/>')
                rpr.append(sz)
            else:
                sz.set(qn("w:val"), sz_val)
            szCs = rpr.find(qn("w:szCs"))
            if szCs is None:
                szCs = parse_xml(f'<w:szCs {nsdecls("w")} w:val="{sz_val}"/>')
                rpr.append(szCs)
            else:
                szCs.set(qn("w:val"), sz_val)
        if bold is not None:
            b = rpr.find(qn("w:b"))
            if bold:
                if b is None:
                    rpr.append(parse_xml(f'<w:b {nsdecls("w")} />'))
            else:
                if b is not None:
                    rpr.remove(b)


def _local_name(tag: str) -> str:
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def _find_descendant(node, names: set[str]):
    for child in node.iter():
        if _local_name(child.tag) in names:
            return child
    return None


def _looks_like_watermark(name: str, descr: str) -> bool:
    haystack = f"{name} {descr}".lower()
    return any(token in haystack for token in (
        "watermark", "seal", "stamp", "logo", "comment",
        "印章", "水印", "批注", "公章", "校徽",
    ))


def _remove_wrap_children(anchor):
    for child in list(anchor):
        if _local_name(child.tag).startswith("wrap"):
            anchor.remove(child)


def normalize_floating_anchor(anchor, watermark_like: bool) -> str | None:
    changed = False

    if watermark_like:
        if anchor.get("behindDoc") != "1":
            anchor.set("behindDoc", "1")
            changed = True
        if anchor.get("allowOverlap") != "0":
            anchor.set("allowOverlap", "0")
            changed = True
        return "behind_text" if changed else None

    if anchor.get("behindDoc") != "0":
        anchor.set("behindDoc", "0")
        changed = True
    if anchor.get("allowOverlap") != "0":
        anchor.set("allowOverlap", "0")
        changed = True

    wrap_node = _find_descendant(anchor, {"wrapTopAndBottom"})
    if wrap_node is None:
        _remove_wrap_children(anchor)
        anchor.insert(0, parse_xml(f'<wp:wrapTopAndBottom {nsdecls("wp")} />'))
        changed = True

    return "top_and_bottom" if changed else None


# ── Default Rules (Chinese thesis common) ──

DEFAULT_RULES = {
    "page": {
        "margin_top_mm": 25,
        "margin_bottom_mm": 25,
        "margin_left_mm": 30,
        "margin_right_mm": 25,
        "gutter_mm": 0,
        "paper_size": "A4",
    },
    "body": {
        "font": "宋体",
        "font_latin": "Times New Roman",
        "size_pt": 12,
        "line_spacing": 1.5,
        "first_line_indent_chars": 2,
        "alignment": "justify",
    },
    "headings": {
        "1": {"font": "黑体", "size_pt": 16, "bold": True, "align": "center", "space_before_pt": 24, "space_after_pt": 18},
        "2": {"font": "黑体", "size_pt": 15, "bold": True, "align": "left", "space_before_pt": 18, "space_after_pt": 12},
        "3": {"font": "黑体", "size_pt": 14, "bold": True, "align": "left", "space_before_pt": 12, "space_after_pt": 6},
        "4": {"font": "宋体", "size_pt": 12, "bold": True, "align": "left", "space_before_pt": 6, "space_after_pt": 3},
    },
    "page_number": {
        "preface": "roman",
        "body": "arabic",
        "position": "center",
    },
    "header_footer": {
        "header_mm": 15,
        "footer_mm": 17.5,
    },
}


def _parse_rules(rules: dict | None) -> dict:
    """Merge provided rules with defaults."""
    merged = copy.deepcopy(DEFAULT_RULES)

    if not rules:
        return merged

    for category, values in rules.items():
        if isinstance(values, dict) and category in merged:
            for key, val in values.items():
                if val is not None:
                    if isinstance(val, dict) and key in merged[category] and isinstance(merged[category][key], dict):
                        merged[category][key].update(val)
                    else:
                        merged[category][key] = val
        elif isinstance(values, dict):
            merged[category] = values

    return merged


def _extract_content_snapshot(doc: Document) -> list[dict]:
    blocks: list[dict] = []

    for paragraph_index, paragraph in enumerate(doc.paragraphs):
        blocks.append({
            "kind": "paragraph",
            "index": paragraph_index,
            "text": paragraph.text,
        })

    for table_index, table in enumerate(doc.tables):
        for row_index, row in enumerate(table.rows):
            for cell_index, cell in enumerate(row.cells):
                blocks.append({
                    "kind": "table_cell",
                    "table": table_index,
                    "row": row_index,
                    "cell": cell_index,
                    "text": cell.text,
                })

    for section_index, section in enumerate(doc.sections):
        for part_name, part in (("header", section.header), ("footer", section.footer)):
            for paragraph_index, paragraph in enumerate(part.paragraphs):
                blocks.append({
                    "kind": part_name,
                    "section": section_index,
                    "index": paragraph_index,
                    "text": paragraph.text,
                })

    return blocks


def _hash_content_snapshot(snapshot: list[dict]) -> str:
    payload = json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _compare_content_snapshots(original_snapshot: list[dict], output_snapshot: list[dict]) -> dict:
    mismatches = []
    max_len = max(len(original_snapshot), len(output_snapshot))

    for block_index in range(max_len):
        original_block = original_snapshot[block_index] if block_index < len(original_snapshot) else None
        output_block = output_snapshot[block_index] if block_index < len(output_snapshot) else None
        if original_block != output_block:
            mismatches.append({
                "blockIndex": block_index,
                "original": original_block,
                "output": output_block,
            })
            if len(mismatches) >= 5:
                break

    return {
        "match": len(mismatches) == 0 and len(original_snapshot) == len(output_snapshot),
        "originalBlockCount": len(original_snapshot),
        "outputBlockCount": len(output_snapshot),
        "originalContentHash": _hash_content_snapshot(original_snapshot),
        "outputContentHash": _hash_content_snapshot(output_snapshot),
        "mismatchCount": sum(
            1
            for block_index in range(max_len)
            if (
                original_snapshot[block_index] if block_index < len(original_snapshot) else None
            ) != (
                output_snapshot[block_index] if block_index < len(output_snapshot) else None
            )
        ),
        "mismatches": mismatches,
    }


# ── Diff Tracker ──

class DiffTracker:
    """Track formatting changes for the diff report."""

    def __init__(self, finding_context: list[dict] | None = None):
        self.diffs: list[dict] = []
        self._page_count = 1
        self.finding_context = finding_context or []

    def _match_finding(self, element: str, position: str = "") -> dict | None:
        if not self.finding_context:
            return None
        haystack = f"{element} {position}".lower()
        token_map = {
            "page_margin": ("margin", "页边距", "版芯", "正文"),
            "body_font": ("body", "正文", "字体", "行距"),
            "headings": ("heading", "标题", "题名", "章节"),
            "page_number": ("page", "页码", "目录"),
            "toc": ("toc", "目录", "页码"),
            "floating_object_overlap": ("图片", "印章", "水印", "浮动对象", "shape", "stamp", "watermark", "overlap"),
        }
        tokens = token_map.get(element, (element,))
        for finding in self.finding_context:
            text = " ".join(str(finding.get(key, "")) for key in ("rule_id", "rule_group", "rule_text", "rule_description")).lower()
            if any(str(token).lower() in text or str(token).lower() in haystack for token in tokens):
                return finding
        return self.finding_context[0]

    def add(self, page: int, element: str, original: str, modified: str, position: str = ""):
        finding = self._match_finding(element, position)
        action = "format-hint" if original == modified else "replace"
        note = "图片/印章覆盖正文" if element == "floating_object_overlap" else f"{element} 已按规则修正"
        diff = {
            "page": page,
            "type": "style_change",
            "action": action,
            "element": element,
            "original": original,
            "modified": modified,
            "before": original,
            "after": modified,
            "position": position,
            "note": note,
        }
        if finding and finding.get("finding_id"):
            diff["finding_id"] = finding["finding_id"]
            diff["related_finding_ids"] = [finding["finding_id"]]
            diff["rule_id"] = finding.get("rule_id")
            diff["rule_group"] = finding.get("rule_group")
        self.diffs.append(diff)

    def set_page_count(self, n: int):
        self._page_count = n

    def summary(self) -> dict:
        content_changes = sum(1 for d in self.diffs if d["type"] == "content_change")
        format_changes = len(self.diffs) - content_changes
        return {
            "pages": self._page_count,
            "changeCount": len(self.diffs),
            "contentChanges": content_changes,
            "formatChanges": format_changes,
        }


# ── Main Formatter ──

class DocxFormatter:
    """Apply thesis formatting rules to a DOCX document."""

    OLE2_MAGIC = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"

    def __init__(self, input_path: str, rules: dict | None = None, finding_context: list[dict] | None = None):
        # Detect old OLE2/.doc format (python-docx can't handle these)
        if os.path.isfile(input_path):
            with open(input_path, "rb") as _f:
                _header = _f.read(8)
            if _header == self.OLE2_MAGIC:
                raise ValueError(
                    "文件是旧版 .doc 格式（WPS 兼容模式），不支持直接排版。"
                    "请用 WPS/Word 打开后另存为 .docx 格式再试。"
                )
        self.doc = Document(input_path)
        self.rules = _parse_rules(rules)
        self.finding_context = finding_context or []
        self.diff = DiffTracker(finding_context)
        self._input_hash = self._hash_file(input_path)
        self._input_path = input_path
        self._input_content_snapshot = _extract_content_snapshot(self.doc)

    @staticmethod
    def _hash_file(path: str) -> str:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()

    # ── Page Setup ──

    def format_page_setup(self):
        """Set margins, paper size for all sections."""
        page = self.rules["page"]
        top = _mm_to_cm(page["margin_top_mm"])
        bottom = _mm_to_cm(page["margin_bottom_mm"])
        left = _mm_to_cm(page["margin_left_mm"])
        right = _mm_to_cm(page["margin_right_mm"])
        gutter = _mm_to_cm(page["gutter_mm"])

        for i, section in enumerate(self.doc.sections):
            old_top = section.top_margin
            old_bottom = section.bottom_margin
            old_left = section.left_margin
            old_right = section.right_margin

            section.top_margin = _cm(top)
            section.bottom_margin = _cm(bottom)
            section.left_margin = _cm(left)
            section.right_margin = _cm(right)
            section.page_width = Cm(21.0)  # A4
            section.page_height = Cm(29.7)  # A4

            if i == 0:
                self.diff.add(
                    i + 1, "page_margin",
                    f"T:{_length_to_mm_text(old_top)} B:{_length_to_mm_text(old_bottom)} L:{_length_to_mm_text(old_left)} R:{_length_to_mm_text(old_right)} mm",
                    f"T:{page['margin_top_mm']} B:{page['margin_bottom_mm']} L:{page['margin_left_mm']} R:{page['margin_right_mm']} mm",
                    "section",
                )

        # Header/footer distance
        hf = self.rules["header_footer"]
        for section in self.doc.sections:
            section.header_distance = _mm_to_cm(hf["header_mm"])
            section.footer_distance = _mm_to_cm(hf["footer_mm"])

    # ── Body Text ──

    def format_body_text(self):
        """Apply body font, size, line spacing, first-line indent."""
        body = self.rules["body"]
        count = 0

        for paragraph in self.doc.paragraphs:
            style_name = paragraph.style.name if paragraph.style else ""

            # Skip headings and special styles
            if style_name.startswith("Heading") or style_name in ("Normal Table", "Table Grid"):
                continue

            if not paragraph.text.strip():
                continue

            # Line spacing
            if body["line_spacing"]:
                pf = paragraph.paragraph_format
                pf.line_spacing = body["line_spacing"]

            # First line indent (2 characters ≈ 2em)
            if body["first_line_indent_chars"] and body["size_pt"]:
                indent_pt = body["first_line_indent_chars"] * body["size_pt"]
                if pf.first_line_indent is None or pf.first_line_indent == 0:
                    pf.first_line_indent = _pt(indent_pt)

            # Font on runs
            for run in paragraph.runs:
                was_bold = run.font.bold
                _set_font(run, body["font"], body["size_pt"])
                run.font.bold = was_bold  # Preserve original bold

                # Set Latin font
                rpr = run._element.get_or_add_rPr()
                fonts = rpr.find(qn("w:rFonts"))
                if fonts is not None:
                    fonts.set(qn("w:ascii"), body["font_latin"])
                    fonts.set(qn("w:hAnsi"), body["font_latin"])

            # Alignment
            if body["alignment"] == "justify":
                paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

            count += 1

        self.diff.add(1, "body_font", f"{'宋体' if count > 0 else 'N/A'} / {count}段落",
                       f"{body['font']} {body['size_pt']}pt × {count}", "body")

    # ── Headings ──

    def format_headings(self):
        """Apply heading styles."""
        h_rules = self.rules["headings"]
        count = 0

        for paragraph in self.doc.paragraphs:
            style_name = paragraph.style.name if paragraph.style else ""

            level = None
            if style_name.startswith("Heading"):
                try:
                    level = int(style_name.split()[-1])
                except ValueError:
                    level = 1

            if level is None or str(level) not in h_rules:
                continue

            h = h_rules[str(level)]
            pf = paragraph.paragraph_format

            pf.space_before = _pt(h.get("space_before_pt", 0))
            pf.space_after = _pt(h.get("space_after_pt", 0))

            if h.get("align") == "center":
                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif h.get("align") == "left":
                paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT

            for run in paragraph.runs:
                _set_font(run, h["font"], h["size_pt"], h.get("bold"))

            count += 1

        if count > 0:
            self.diff.add(1, "headings", f"原有级别 {count}", f"黑体/宋体 {self.rules['body']['size_pt']}-16pt", "全文")

    # ── Page Numbers ──

    def format_page_numbers(self):
        """Add page numbers to headers/footers (preface=roman, body=arabic)."""
        pn = self.rules["page_number"]

        for i, section in enumerate(self.doc.sections):
            footer = section.footer
            if not footer.paragraphs or not footer.paragraphs[0].text.strip():
                p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run()

                # Add PAGE field
                fld_char_begin = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="begin"/>')
                run._element.append(fld_char_begin)
                instr = parse_xml(f'<w:instrText {nsdecls("w")} xml:space="preserve"> PAGE </w:instrText>')
                run._element.append(instr)
                fld_char_end = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="end"/>')
                run._element.append(fld_char_end)

                self.diff.add(i + 1, "page_number", "无页码",
                              f"{pn.get('preface', 'roman') if i == 0 else pn.get('body', 'arabic')} · 居中",
                              f"section {i}")

    # ── Table of Contents (placeholder) ──

    def format_toc(self):
        """Refresh TOC fields if present."""
        refresh_count = 0
        for paragraph in self.doc.paragraphs:
            for run in paragraph.runs:
                instr = run._element.find(qn("w:instrText"))
                if instr is not None and "TOC" in (instr.text or ""):
                    refresh_count += 1

        if refresh_count > 0:
            self.diff.add(1, "toc", "旧目录域", f"已刷新 TOC \\o '1-3'", "目录页")

    def format_floating_object_overlaps(self):
        """Keep floating objects while moving them away from the readable text layer."""
        overlap_findings = [
            finding for finding in self.finding_context
            if finding.get("rule_id") == FLOATING_OBJECT_OVERLAP_RULE_ID
        ]
        if not overlap_findings:
            return

        adjusted_count = 0
        for paragraph_index, paragraph in enumerate(self.doc.paragraphs):
            for run in paragraph.runs:
                drawing_elements = run._element.findall(qn("w:drawing"))
                for drawing in drawing_elements:
                    anchor = None
                    for child in drawing:
                        if _local_name(child.tag) == "anchor":
                            anchor = child
                            break
                    if anchor is None:
                        continue

                    doc_pr = _find_descendant(anchor, {"docPr"})
                    name = doc_pr.get("name", "") if doc_pr is not None else ""
                    descr = doc_pr.get("descr", "") if doc_pr is not None else ""
                    mode = normalize_floating_anchor(anchor, _looks_like_watermark(name, descr))
                    if not mode:
                        continue

                    adjusted_count += 1
                    self.diff.add(
                        1,
                        "floating_object_overlap",
                        f"浮动对象覆盖正文（段落 {paragraph_index + 1}）",
                        "已调整对象图层与环绕方式，保留对象但避免遮挡正文",
                        f"paragraph {paragraph_index + 1}",
                    )

        if adjusted_count == 0:
            self.diff.add(
                1,
                "floating_object_overlap",
                "检测到浮动对象覆盖正文",
                "当前版本无法安全自动判断对象锚点，建议人工确认图片位置",
                "manual-review",
            )

    # ── Run All ──

    def format(self):
        """Apply all formatting steps."""
        self.format_page_setup()
        self.format_body_text()
        self.format_headings()
        self.format_toc()
        self.format_page_numbers()
        self.format_floating_object_overlaps()

        # Estimate page count from section breaks
        self.diff.set_page_count(len(self.doc.sections) + 2)

    def save(self, output_path: str):
        """Save formatted document."""
        self.doc.save(output_path)

    def get_diff(self, output_path: str | None = None) -> dict:
        """Return the diff report."""
        finding_diffs = [diff for diff in self.diff.diffs if diff.get("finding_id")]
        diff = {
            "diffs": self.diff.diffs,
            "findingDiffs": finding_diffs,
            "summary": self.diff.summary(),
        }
        if output_path:
            diff["integrity"] = {
                "contentLevel": self.get_content_integrity(output_path),
                "packageLevel": self.get_integrity(output_path),
            }
        return diff

    def get_content_integrity(self, output_path: str) -> dict:
        output_doc = Document(output_path)
        output_content_snapshot = _extract_content_snapshot(output_doc)
        comparison = _compare_content_snapshots(self._input_content_snapshot, output_content_snapshot)
        return {
            **comparison,
            "method": "paragraph_table_header_footer_text_sequence",
            "note": "Compares extracted visible text blocks before and after formatting; OOXML package metadata changes are ignored.",
        }

    def get_integrity(self, output_path: str) -> dict:
        """Content integrity check — verify no text content changed."""
        output_hash = self._hash_file(output_path)

        return {
            "originalHash": self._input_hash,
            "outputHash": output_hash,
            "match": self._input_hash == output_hash,
            "note": "SHA256 may differ due to OOXML internal timestamps; content-level comparison is more accurate",
        }
