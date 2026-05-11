#!/usr/bin/env python3
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
        }],
        "paragraphs": [{"index": i, "text": p, "style": "",
                        "alignment": "left",
                        "indent": {"left_pt": 0, "right_pt": 0,
                                   "first_line_pt": 0, "first_line_cm": 0},
                        "spacing": {"before_pt": 0, "after_pt": 0,
                                    "line_spacing": 1.5},
                        "is_heading": False, "heading_level": 0,
                        "page_break_before": False, "runs": []}
                       for i, p in enumerate(paragraphs)],
        "headings": headings,
        "tables": [],
        "images": [],
        "structure": [],
    }


def parse_docx(filepath: str) -> dict:
    """Parse a .docx file and return its structure as a dict."""

    # ── Detect old OLE2/.doc format ──
    if _is_ole2_format(filepath):
        return parse_ole2_docx(filepath)

    doc = Document(filepath)

    return {
        "metadata": extract_metadata(doc),
        "sections": extract_sections(doc),
        "paragraphs": extract_paragraphs(doc),
        "headings": extract_headings(doc),
        "tables": extract_tables(doc),
        "images": extract_images(doc),
        "structure": detect_structure(doc),
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


def _get_font_props(run) -> dict:
    font = run.font
    return {
        "name": font.name or "",
        "size_pt": round(font.size.pt, 1) if font.size else 12,
        "bold": bool(font.bold),
        "italic": bool(font.italic),
        "underline": bool(font.underline),
        "color_rgb": str(font.color.rgb) if font.color and font.color.rgb else "",
    }


def extract_paragraphs(doc: Document) -> list[dict]:
    """Extract all paragraphs with formatting and style info."""
    result = []
    for i, para in enumerate(doc.paragraphs):
        text = para.text.strip()
        style = para.style.name if para.style else ""
        runs_data = []
        for run in para.runs:
            runs_data.append({
                "text": run.text,
                **_get_font_props(run),
            })

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


def extract_tables(doc: Document) -> list[dict]:
    """Extract tables with row/col count and cell content."""
    result = []
    for ti, table in enumerate(doc.tables):
        rows_count = len(table.rows)
        cols_count = len(table.columns)
        rows_data = []
        for ri, row in enumerate(table.rows):
            cells = [cell.text.strip() for cell in row.cells]
            rows_data.append({"index": ri, "cells": cells})
        result.append({
            "index": ti,
            "rows": rows_count,
            "cols": cols_count,
            "data": rows_data,
        })
    return result


def extract_images(doc: Document) -> list[dict]:
    """Extract inline images/shapes from the document."""
    result = []
    for i, para in enumerate(doc.paragraphs):
        for run in para.runs:
            drawing_elements = run._element.findall(qn("w:drawing"))
            for drawing in drawing_elements:
                # Try to extract image size from extent
                extent = drawing.findall(qn("wp:extent"))
                cx = 0
                cy = 0
                for ext in extent:
                    cx = int(ext.get("cx", 0))
                    cy = int(ext.get("cy", 0))
                result.append({
                    "paragraph_index": i,
                    "width_pt": round(cx / 914400 * 72, 1) if cx else 0,
                    "height_pt": round(cy / 914400 * 72, 1) if cy else 0,
                })
    return result


def detect_structure(doc: Document) -> list[dict]:
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
    paragraphs = doc.paragraphs

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
            structure.append({
                "index": i,
                "type": "references_header",
                "text": text,
                "confidence": 0.95,
            })
            continue

        # Headings
        if para.style and para.style.name.startswith("Heading"):
            structure.append({
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
                structure.append({
                    "index": i,
                    "type": "figure_caption",
                    "text": text,
                    "confidence": 0.90,
                })
                continue

        # Table captions (表 x-x or Table X)
        if table_pattern.match(text) or ("caption" in style_name and ("表" in text or "table" in text.lower())):
            structure.append({
                "index": i,
                "type": "table_caption",
                "text": text,
                "confidence": 0.90,
            })
            continue

        # Abstract detection
        if abstract_pattern.match(text):
            found_abstract = True
            structure.append({
                "index": i,
                "type": "abstract",
                "text": text,
                "confidence": 0.97,
            })
            continue
        if found_abstract and not para.style.name.startswith("Heading") and len(text) > 50:
            structure.append({
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
            structure.append({
                "index": i,
                "type": "toc",
                "text": text,
                "confidence": 0.95,
            })
            continue

        # Reference entries (numbered citations like [1], [1-3], etc.)
        if in_references and re.match(r'^\[\d+', text):
            structure.append({
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
