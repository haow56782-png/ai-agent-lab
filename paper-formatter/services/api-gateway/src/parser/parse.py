#!/usr/bin/env python3
from __future__ import annotations
"""
DOCX Structure Parser for 正稿 (ZhengGao).

Reads a .docx file using python-docx and outputs structured JSON to stdout
with all document structure elements needed for rule matching and diff preview.

Usage:
    python3 src/parse.py <path-to-docx>
    python3 src/parse.py --format json <path-to-docx>  (default)

Output (JSON):
    {
      "metadata": { ... },
      "sections": [ ... ],
      "paragraphs": [ ... ],
      "headings": [ ... ],
      "tables": [ ... ],
      "images": [ ... ],
      "structure": [ ... ]  // detected structural elements
    }
"""

import sys
import json
import re
from pathlib import Path

try:
    from docx import Document
    from docx.shared import Pt, Cm, Inches, Emu
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
except ImportError as e:
    print(json.dumps({"error": f"Missing dependency: {e}. Run: pip install python-docx"}), file=sys.stderr)
    sys.exit(1)

# ── OLE2 (old .doc) detection ──
OLE2_MAGIC = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"

def _is_ole2_format(filepath: str) -> bool:
    """Check if file is an old OLE2 / .doc format (not OOXML .docx)."""
    try:
        with open(filepath, "rb") as f:
            header = f.read(8)
        return header == OLE2_MAGIC
    except Exception:
        return False


def _extract_ole2_text(filepath: str) -> str:
    """Extract text from an old OLE2-format .doc file using olefile."""
    try:
        import olefile
    except ImportError:
        raise RuntimeError(
            "文件是旧版 .doc 格式（OLE2），需要 olefile 库来提取文本。"
        )

    ole = olefile.OleFileIO(filepath)
    try:
        wd = ole.openstream("WordDocument").read()
    except Exception as e:
        raise RuntimeError(f"旧版 .doc 格式解析失败（WordDocument 流不可读）: {e}")
    finally:
        ole.close()

    # Decode as UTF-16LE (Word's internal encoding)
    text = wd.decode("utf-16-le", errors="replace")
    # Keep only printable chars, newlines, and common whitespace
    import unicodedata
    chars = []
    for c in text:
        if c == "\r":
            chars.append("\n")
        elif unicodedata.category(c) in ("Cc", "Cf") and c not in ("\n", "\t"):
            continue
        else:
            chars.append(c)
    return "".join(chars)


def parse_ole2_docx(filepath: str) -> dict:
    """
    Parse an old .doc (OLE2) file by extracting text and building a
    best-effort structure.  Returns the same schema as parse_docx().
    """
    raw = _extract_ole2_text(filepath)
    lines = raw.split("\n")

    # Basic paragraph detection (split by double-newline or heuristic)
    paragraphs = []
    headings = []
    buf = []
    heading_level = 0
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if buf:
                text = "".join(buf).strip()
                if text:
                    paragraphs.append(text)
                buf = []
            continue

        # Heuristic heading detection: short centered-like lines
        if len(stripped) < 50 and any(
            kw in stripped for kw in ("摘要", "目录", "参考文献", "Abstract",
                                      "第", "章", "节")
        ):
            headings.append({"index": len(paragraphs), "text": stripped,
                             "level": 1, "style": "Heading 1"})
            paragraphs.append(stripped)
        elif stripped and stripped[0].isdigit() and "." in stripped[:4]:
            # Potential numbered heading like "1.1", "1.1.1"
            level = stripped[:stripped.index(".")].count(".") + 1
            headings.append({"index": len(paragraphs), "text": stripped,
                             "level": min(level, 4), "style": f"Heading {min(level, 4)}"})
            paragraphs.append(stripped)
        else:
            buf.append(stripped)

    if buf:
        text = "".join(buf).strip()
        if text:
            paragraphs.append(text)

    return {
        "metadata": {
            "paragraphs": len(paragraphs),
            "tables": 0,
            "sections": 1,
            "_ole2_warning": "文件是旧版 .doc 格式（WPS 兼容模式），"
                             "推荐用 WPS/Word 另存为 .docx 后重试以获得更精确的解析结果。",
        },
        "sections": [{
            "index": 0,
            "page_width_cm": 21.0,
            "page_height_cm": 29.7,
            "orientation": "portrait",
            "margin_top_mm": 25.4,
            "margin_bottom_mm": 25.4,
            "margin_left_mm": 31.7,
            "margin_right_mm": 31.7,
            "header_distance_mm": 0,
            "footer_distance_mm": 0,
            "start_type": "continuous",
            "header_present": False,
            "footer_present": False,
            "header_text": "",
            "footer_text": "",
            "footer_alignment": "left",
            "footer_has_page_field": False,
            "footer_page_field_count": 0,
            "footer_page_number_format": "unknown",
        }],
        "paragraphs": [{"index": i, "text": p, "style": "",
                        "alignment": "left",
                        "indent": {"left_pt": 0, "right_pt": 0,
                                   "first_line_pt": 0, "first_line_cm": 0},
                        "spacing": {"before_pt": 0, "after_pt": 0,
                                    "line_spacing": 1.5},
                        "is_heading": False, "heading_level": 0,
                        "page_break_before": False, "runs": [],
                        "flow_order": i,
                        "prev_flow_kind": "paragraph" if i > 0 else None,
                        "next_flow_kind": "paragraph" if i < len(paragraphs) - 1 else None,
                        "contains_image": False,
                        "image_count": 0}
                       for i, p in enumerate(paragraphs)],
        "headings": headings,
        "tables": [],
        "images": [],
        "structure": [],
        "flow": [{"order": i, "kind": "paragraph", "paragraph_index": i, "text": p[:80]} for i, p in enumerate(paragraphs)],
    }


def parse_docx(filepath: str) -> dict:
    """Parse a .docx file and return its structure as a dict."""

    # ── Detect old OLE2/.doc format ──
    if _is_ole2_format(filepath):
        return parse_ole2_docx(filepath)

    doc = Document(filepath)
    flow_bundle = extract_document_flow(doc)
    paragraphs = extract_paragraphs(doc, flow_bundle["paragraphs"])
    tables = extract_tables(doc, flow_bundle["tables"])
    images = extract_images(doc, flow_bundle["paragraphs"])

    return {
        "metadata": extract_metadata(doc),
        "sections": extract_sections(doc),
        "paragraphs": paragraphs,
        "headings": extract_headings(doc),
        "tables": tables,
        "images": images,
        "structure": detect_structure(doc, flow_bundle["paragraphs"]),
        "flow": flow_bundle["items"],
    }


def extract_metadata(doc: Document) -> dict:
    """Extract document-level metadata."""
    core = doc.core_properties
    para_count = len(doc.paragraphs)
    table_count = len(doc.tables)
    section_count = len(doc.sections)
    return {
        "paragraphs": para_count,
        "tables": table_count,
        "sections": section_count,
        "author": core.author or "",
        "title": core.title or "",
        "subject": core.subject or "",
        "created": str(core.created) if core.created else "",
        "modified": str(core.modified) if core.modified else "",
        "last_modified_by": core.last_modified_by or "",
    }


def extract_sections(doc: Document) -> list[dict]:
    """Extract section-level properties (page setup, headers, footers)."""
    result = []
    for i, section in enumerate(doc.sections):
        header_texts = [_paragraph_display_text(p) for p in section.header.paragraphs if _paragraph_display_text(p)] if section.header else []
        footer_texts = [_paragraph_display_text(p) for p in section.footer.paragraphs if _paragraph_display_text(p)] if section.footer else []
        footer_alignment = None
        footer_page_field_count = 0
        if section.footer and section.footer.paragraphs:
            first_footer_para = next((p for p in section.footer.paragraphs if p.text.strip()), section.footer.paragraphs[0])
            footer_alignment = _get_alignment(first_footer_para)
            footer_page_field_count = sum(1 for paragraph in section.footer.paragraphs if _paragraph_contains_page_field(paragraph))
        footer_text = " ".join(footer_texts[:3])
        result.append({
            "index": i,
            "page_width_cm": round(section.page_width / 914400 * 2.54, 2) if section.page_width else 21.0,
            "page_height_cm": round(section.page_height / 914400 * 2.54, 2) if section.page_height else 29.7,
            "orientation": "landscape" if section.orientation else "portrait",
            "margin_top_mm": round(section.top_margin / 914400 * 25.4, 1) if section.top_margin else 25.4,
            "margin_bottom_mm": round(section.bottom_margin / 914400 * 25.4, 1) if section.bottom_margin else 25.4,
            "margin_left_mm": round(section.left_margin / 914400 * 25.4, 1) if section.left_margin else 31.7,
            "margin_right_mm": round(section.right_margin / 914400 * 25.4, 1) if section.right_margin else 31.7,
            "header_distance_mm": round(section.header_distance / 914400 * 25.4, 1) if section.header_distance else 0,
            "footer_distance_mm": round(section.footer_distance / 914400 * 25.4, 1) if section.footer_distance else 0,
            "start_type": str(section.start_type) if section.start_type else "continuous",
            "header_present": bool(section.header),
            "footer_present": bool(section.footer),
            "header_text": " ".join(header_texts[:3]),
            "footer_text": footer_text,
            "footer_alignment": footer_alignment or "left",
            "footer_has_page_field": footer_page_field_count > 0,
            "footer_page_field_count": footer_page_field_count,
            "footer_page_number_format": _detect_page_number_format(footer_text),
        })
    return result


def _get_alignment(paragraph) -> str:
    align_map = {
        WD_ALIGN_PARAGRAPH.LEFT: "left",
        WD_ALIGN_PARAGRAPH.CENTER: "center",
        WD_ALIGN_PARAGRAPH.RIGHT: "right",
        WD_ALIGN_PARAGRAPH.JUSTIFY: "justify",
        WD_ALIGN_PARAGRAPH.DISTRIBUTE: "distribute",
    }
    return align_map.get(paragraph.alignment, "left")


def _get_indent(paragraph) -> dict:
    fmt = paragraph.paragraph_format
    left = fmt.left_indent
    right = fmt.right_indent
    first = fmt.first_line_indent
    return {
        "left_pt": round(left.pt, 1) if left else 0,
        "right_pt": round(right.pt, 1) if right else 0,
        "first_line_pt": round(first.pt, 1) if first else 0,
        "first_line_cm": round(first / 914400 * 2.54, 2) if first else 0,
    }


def _get_spacing(paragraph) -> dict:
    fmt = paragraph.paragraph_format
    before = fmt.space_before
    after = fmt.space_after
    line = fmt.line_spacing
    return {
        "before_pt": round(before.pt, 1) if before else 0,
        "after_pt": round(after.pt, 1) if after else 0,
        "line_spacing": round(line, 2) if line else 1.5,
    }


def _collect_field_instructions(node) -> list[str]:
    instructions = []
    for child in node.iter():
        local = _local_name(child.tag)
        if local == "fldSimple":
            instr = child.get(qn("w:instr")) or child.get("instr") or ""
            if instr:
                instructions.append(instr)
        elif local == "instrText" and child.text:
            instructions.append(child.text)
    return instructions


def _paragraph_contains_page_field(paragraph) -> bool:
    instructions = " ".join(_collect_field_instructions(paragraph._element)).upper()
    return " PAGE " in f" {instructions} " or instructions.strip().startswith("PAGE")


def _paragraph_display_text(paragraph) -> str:
    text = paragraph.text.strip()
    if text:
        return text
    fragments = []
    for child in paragraph._element.iter():
        if _local_name(child.tag) == "t" and child.text:
            fragments.append(child.text)
    return "".join(fragments).strip()


def _detect_page_number_format(text: str) -> str:
    candidate = re.sub(r"[\s\-–—.·]+", "", text or "").strip()
    if not candidate:
        return "unknown"
    if re.fullmatch(r"[ivxlcdm]+", candidate, re.IGNORECASE):
        return "roman"
    if re.fullmatch(r"\d+", candidate):
        return "arabic"
    return "mixed"


def _count_drawings(paragraph) -> int:
    return sum(1 for child in paragraph._element.iter() if _local_name(child.tag) == "drawing")


def extract_document_flow(doc: Document) -> dict:
    """Extract body-order anchors so evaluators can reason about real document flow."""
    items = []
    paragraph_cursor = 0
    table_cursor = 0
    for child in doc.element.body.iterchildren():
        local = _local_name(child.tag)
        if local == "p":
            if paragraph_cursor >= len(doc.paragraphs):
                continue
            paragraph_index = paragraph_cursor
            paragraph_cursor += 1
            text = doc.paragraphs[paragraph_index].text.strip()
            items.append({
                "order": len(items),
                "kind": "paragraph",
                "paragraph_index": paragraph_index,
                "text": text[:120],
            })
        elif local == "tbl":
            if table_cursor >= len(doc.tables):
                continue
            table_index = table_cursor
            table_cursor += 1
            first_cell = ""
            try:
                first_row = doc.tables[table_index].rows[0]
                first_cell = first_row.cells[0].text.strip() if first_row.cells else ""
            except Exception:
                first_cell = ""
            items.append({
                "order": len(items),
                "kind": "table",
                "table_index": table_index,
                "text": first_cell[:120],
            })
        elif local == "sectPr":
            items.append({
                "order": len(items),
                "kind": "section_break",
            })

    for idx, item in enumerate(items):
        item["prev_kind"] = items[idx - 1]["kind"] if idx > 0 else None
        item["next_kind"] = items[idx + 1]["kind"] if idx + 1 < len(items) else None

    paragraph_flow = {}
    table_flow = {}
    for item in items:
        meta = {
            "flow_order": item["order"],
            "prev_flow_kind": item.get("prev_kind"),
            "next_flow_kind": item.get("next_kind"),
        }
        if item["kind"] == "paragraph":
            paragraph_flow[item["paragraph_index"]] = meta
        elif item["kind"] == "table":
            table_flow[item["table_index"]] = meta

    return {
        "items": items,
        "paragraphs": paragraph_flow,
        "tables": table_flow,
    }


def _get_font_props(run) -> dict:
    font = run.font
    return {
        "name": font.name or "",
        "size_pt": round(font.size.pt, 1) if font.size else 12,
        "bold": bool(font.bold),
        "italic": bool(font.italic),
        "underline": bool(font.underline),
        "subscript": bool(font.subscript),
        "superscript": bool(font.superscript),
        "color_rgb": str(font.color.rgb) if font.color and font.color.rgb else "",
    }


def extract_paragraphs(doc: Document, paragraph_flow: dict[int, dict] | None = None) -> list[dict]:
    """Extract all paragraphs with formatting and style info."""
    result = []
    paragraph_flow = paragraph_flow or {}
    for i, para in enumerate(doc.paragraphs):
        text = para.text.strip()
        style = para.style.name if para.style else ""
        runs_data = []
        for run in para.runs:
            runs_data.append({
                "text": run.text,
                **_get_font_props(run),
            })

        image_count = _count_drawings(para)
        flow_meta = paragraph_flow.get(i, {})
        result.append({
            "index": i,
            "text": para.text,
            "style": style,
            "alignment": _get_alignment(para),
            "indent": _get_indent(para),
            "spacing": _get_spacing(para),
            "is_heading": para.style.name.startswith("Heading") if para.style else False,
            "heading_level": int(para.style.name.replace("Heading ", "")) if para.style and para.style.name.startswith("Heading") else 0,
            "page_break_before": para.paragraph_format.page_break_before if para.paragraph_format.page_break_before else False,
            "runs": runs_data,
            "flow_order": flow_meta.get("flow_order"),
            "prev_flow_kind": flow_meta.get("prev_flow_kind"),
            "next_flow_kind": flow_meta.get("next_flow_kind"),
            "contains_image": image_count > 0,
            "image_count": image_count,
        })
    return result


def extract_headings(doc: Document) -> list[dict]:
    """Extract all headings with level and bookmark info."""
    result = []
    for i, para in enumerate(doc.paragraphs):
        if para.style and para.style.name.startswith("Heading"):
            text = para.text.strip()
            if text:
                result.append({
                    "index": i,
                    "text": para.text,
                    "level": int(para.style.name.replace("Heading ", "")),
                    "style": para.style.name,
                })
    return result


def extract_tables(doc: Document, table_flow: dict[int, dict] | None = None) -> list[dict]:
    """Extract tables with row/col count and cell content."""
    result = []
    table_flow = table_flow or {}
    for ti, table in enumerate(doc.tables):
        rows_count = len(table.rows)
        cols_count = len(table.columns)
        rows_data = []
        for ri, row in enumerate(table.rows):
            cells = [cell.text.strip() for cell in row.cells]
            rows_data.append({"index": ri, "cells": cells})
        flow_meta = table_flow.get(ti, {})
        result.append({
            "index": ti,
            "rows": rows_count,
            "cols": cols_count,
            "data": rows_data,
            "flow_order": flow_meta.get("flow_order"),
            "prev_flow_kind": flow_meta.get("prev_flow_kind"),
            "next_flow_kind": flow_meta.get("next_flow_kind"),
        })
    return result


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
    tokens = (
        "watermark", "seal", "stamp", "logo", "comment",
        "印章", "水印", "批注", "公章", "校徽",
    )
    return any(token in haystack for token in tokens)


def extract_images(doc: Document, paragraph_flow: dict[int, dict] | None = None) -> list[dict]:
    """Extract inline images/shapes from the document."""
    result = []
    paragraph_flow = paragraph_flow or {}
    for i, para in enumerate(doc.paragraphs):
        for run in para.runs:
            drawing_elements = run._element.findall(qn("w:drawing"))
            for drawing in drawing_elements:
                container = None
                object_type = "inline"
                for child in drawing:
                    if _local_name(child.tag) == "anchor":
                        container = child
                        object_type = "floating"
                        break
                    if _local_name(child.tag) == "inline":
                        container = child
                        object_type = "inline"
                        break
                if container is None:
                    container = drawing

                extent = [node for node in container.iter() if _local_name(node.tag) == "extent"]
                cx = 0
                cy = 0
                for ext in extent:
                    cx = int(ext.get("cx", 0))
                    cy = int(ext.get("cy", 0))

                doc_pr = _find_descendant(container, {"docPr"})
                name = doc_pr.get("name", "") if doc_pr is not None else ""
                descr = doc_pr.get("descr", "") if doc_pr is not None else ""
                wrap_type = "inline"
                if object_type == "floating":
                    wrap_names = {"wrapNone", "wrapSquare", "wrapTight", "wrapThrough", "wrapTopAndBottom"}
                    wrap_node = _find_descendant(container, wrap_names)
                    wrap_type = _local_name(wrap_node.tag) if wrap_node is not None else "wrapNone"
                behind_text = object_type == "floating" and container.get("behindDoc", "0") in ("1", "true", "True")
                allow_overlap = object_type == "floating" and container.get("allowOverlap", "0") in ("1", "true", "True")
                is_watermark_like = _looks_like_watermark(name, descr)
                overlap_risk = (
                    object_type == "floating"
                    and not behind_text
                    and (allow_overlap or wrap_type in ("wrapNone", "wrapSquare", "wrapTight", "wrapThrough", "wrapTopAndBottom"))
                    and (cx > 0 or cy > 0)
                    and bool(para.text.strip())
                )
                flow_meta = paragraph_flow.get(i, {})
                result.append({
                    "paragraph_index": i,
                    "paragraph_text": para.text.strip()[:160],
                    "width_pt": round(cx / 914400 * 72, 1) if cx else 0,
                    "height_pt": round(cy / 914400 * 72, 1) if cy else 0,
                    "object_type": object_type,
                    "wrap_type": wrap_type,
                    "behind_text": behind_text,
                    "allow_overlap": allow_overlap,
                    "name": name,
                    "description": descr,
                    "is_watermark_like": is_watermark_like,
                    "overlap_risk": overlap_risk,
                    "flow_order": flow_meta.get("flow_order"),
                })
    return result


def detect_structure(doc: Document, paragraph_flow: dict[int, dict] | None = None) -> list[dict]:
    """
    Detect document structural elements by analyzing content.

    Recognized types:
      - cover: First few paragraphs with large font, no heading style
      - abstract: Paragraphs containing 摘要/Abstract keywords
      - toc: Table of contents field or content
      - heading: Headings with level
      - figure_caption: 图/Figure/Fig. captions
      - table_caption: 表/Table captions
      - reference: Reference section content
    """
    structure = []
    paragraph_flow = paragraph_flow or {}
    paragraphs = doc.paragraphs

    def append_structure(item: dict):
        flow_meta = paragraph_flow.get(item.get("index"), {})
        if flow_meta.get("flow_order") is not None:
            item["flow_order"] = flow_meta.get("flow_order")
        structure.append(item)

    # Patterns for detection
    abstract_pattern = re.compile(r'^摘要$|^abstract', re.IGNORECASE)
    toc_pattern = re.compile(r'^目录$|^table\s+of\s+contents', re.IGNORECASE)
    figure_pattern = re.compile(r'^图\s*\d|^figure\s*\d|^fig\.?\s*\d', re.IGNORECASE)
    table_pattern = re.compile(r'^表\s*\d|^table\s*\d', re.IGNORECASE)
    ref_pattern = re.compile(r'^参考文献|^references', re.IGNORECASE)
    cover_pattern = re.compile(r'^[^。\n]{1,30}$')  # short lines, potential cover elements

    found_abstract = False
    found_toc = False
    found_refs = False
    in_references = False

    for i, para in enumerate(paragraphs):
        text = para.text.strip()
        if not text:
            continue

        # References header (match before generic heading check)
        if ref_pattern.match(text):
            found_refs = True
            in_references = True
            append_structure({
                "index": i,
                "type": "references_header",
                "text": text,
                "confidence": 0.95,
            })
            continue

        # Headings
        if para.style and para.style.name.startswith("Heading"):
            append_structure({
                "index": i,
                "type": "heading",
                "text": text,
                "level": int(para.style.name.replace("Heading ", "")),
                "confidence": 0.99,
            })
            continue

        style_name = para.style.name.lower() if para.style else ""

        # Figure captions (图 x-x or Figure X, typically in 题注 style)
        if figure_pattern.match(text) or "caption" in style_name or "题注" in style_name:
            # Check if it looks like a figure ("图" prefix)
            if text.startswith("图") or re.match(r'^[Ff]igure|^[Ff]ig\.', text):
                append_structure({
                    "index": i,
                    "type": "figure_caption",
                    "text": text,
                    "confidence": 0.90,
                })
                continue

        # Table captions (表 x-x or Table X)
        if table_pattern.match(text) or ("caption" in style_name and ("表" in text or "table" in text.lower())):
            append_structure({
                "index": i,
                "type": "table_caption",
                "text": text,
                "confidence": 0.90,
            })
            continue

        # Abstract detection
        if abstract_pattern.match(text):
            found_abstract = True
            append_structure({
                "index": i,
                "type": "abstract",
                "text": text,
                "confidence": 0.97,
            })
            continue
        if found_abstract and not para.style.name.startswith("Heading") and len(text) > 50:
            append_structure({
                "index": i,
                "type": "abstract_body",
                "text": text[:100],
                "confidence": 0.85,
            })
            found_abstract = False  # only capture first body para
            continue

        # TOC detection
        if toc_pattern.match(text):
            found_toc = True
            append_structure({
                "index": i,
                "type": "toc",
                "text": text,
                "confidence": 0.95,
            })
            continue

        # Reference entries (numbered citations like [1], [1-3], etc.)
        if in_references and re.match(r'^\[\d+', text):
            append_structure({
                "index": i,
                "type": "reference_entry",
                "text": text[:120],
                "confidence": 0.75,
            })
            continue

        # End of references
        if in_references and para.style and para.style.name.startswith("Heading"):
            in_references = False

    # Cover detection (first few significant paras before abstract/toc)
    cover_candidates = []
    for i, para in enumerate(paragraphs[:30]):
        text = para.text.strip()
        if not text:
            continue
        # Check if it looks like cover content (short text, large font, centered)
        runs = para.runs
        large_font = False
        if runs:
            for run in runs[:3]:
                if run.font.size and run.font.size.pt >= 16:
                    large_font = True
                    break
        if large_font or (cover_pattern.match(text) and para.alignment == WD_ALIGN_PARAGRAPH.CENTER):
            cover_candidates.append({
                "index": i,
                "type": "cover",
                "text": text[:80],
                "confidence": 0.85 if large_font else 0.60,
            })

    # Insert cover candidates before abstract/toc
    cover_candidates.reverse()
    for cc in cover_candidates:
        structure.insert(0, cc)

    return structure


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: parse.py <path-to-docx> [--format json]"}), file=sys.stderr)
        sys.exit(1)

    filepath = sys.argv[1]
    fmt = "json"
    if "--format" in sys.argv:
        idx = sys.argv.index("--format")
        if idx + 1 < len(sys.argv):
            fmt = sys.argv[idx + 1]

    path = Path(filepath)
    if not path.exists():
        print(json.dumps({"error": f"File not found: {filepath}"}), file=sys.stderr)
        sys.exit(1)

    try:
        result = parse_docx(str(path))
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
