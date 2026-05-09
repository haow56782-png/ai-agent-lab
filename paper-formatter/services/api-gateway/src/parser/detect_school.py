"""Detect school/university name from the cover page of a thesis DOCX file.

Usage: python3 detect_school.py <path/to/file.docx>

Outputs JSON to stdout: { detected: bool, name: str|null, confidence: float, matched_text: str|null }
"""
import json
import re
import sys

try:
    from docx import Document
except ImportError:
    print(json.dumps({"detected": False, "name": None, "confidence": 0, "matched_text": None, "error": "python-docx not installed"}))
    sys.exit(0)


# Patterns sorted by priority (highest confidence first)
PATTERNS = [
    # Direct standalone: "XXX大学" or "XXX学院" at line start (likely title)
    (r'^([一-鿿]{2,}(?:大学|学院))$', 0.95),
    # Prefix: "学校名称：" or "学校：" or "学    校："
    (r'(?:学\s*校\s*[名称]*|[学\s*院])\s*[：:]\s*([一-鿿]{2,}(?:大学|学院))', 0.90),
    # Suffix: "所在学校/院校/单位：XXX大学"
    (r'(?:所在|毕业|就读于?)\s*(?:院校|学校|单位)\s*[：:]\s*([一-鿿]{2,}(?:大学|学院))', 0.88),
    # Lowercase: "xxx大学" embedded in longer text (cover page header)
    (r'([一-鿿]{3,}(?:大学|学院))', 0.80),
    # Standalone "XXX University" in English
    (r'([A-Z][a-z]+ University)', 0.75),
    # Faculty/School pattern: "XXX大学 XXX学院" or "XXX大学XXX学院"
    (r'([一-鿿]{2,}(?:大学|学院))[\s　]*([一-鿿]{2,}(?:学院|系))', 0.85),
]

# Schools known to have abbreviated/accepted short forms
KNOWN_SHORT_NAMES = {
    "清华": "清华大学",
    "北大": "北京大学",
    "同济": "同济大学",
    "复旦": "复旦大学",
    "交大": "上海交通大学",
    "浙大": "浙江大学",
    "南大": "南京大学",
    "南开": "南开大学",
    "武大": "武汉大学",
    "华科": "华中科技大学",
    "中科大": "中国科学技术大学",
    "人大": "中国人民大学",
    "重大": "重庆大学",
}


def extract_cover_text(doc_path: str, max_paras: int = 30) -> list[dict]:
    """Extract first N paragraphs with text and font size info."""
    doc = Document(doc_path)
    paras = []
    for i, p in enumerate(doc.paragraphs):
        if i >= max_paras:
            break
        text = p.text.strip()
        if not text:
            continue
        # Check if any run has large font (>= 16pt) — likely cover page title
        max_font = 0
        for run in p.runs:
            if run.font.size and run.font.size.pt > max_font:
                max_font = run.font.size.pt
        paras.append({
            "text": text,
            "max_font_pt": max_font,
            "is_centered": p.alignment == 1 if p.alignment is not None else False,
        })
    return paras


def detect_school(paras: list[dict]) -> dict:
    """Run detection patterns against extracted cover text."""
    best = {"detected": False, "name": None, "confidence": 0, "matched_text": None}
    seen = set()

    # Normalized text for detection (strip space between CJK chars for matching)
    def normalize(text: str) -> str:
        """Remove spaces between CJK characters for detection matching."""
        import unicodedata
        result = []
        i = 0
        chars = list(text)
        while i < len(chars):
            c = chars[i]
            if c in ' \t　' and i + 1 < len(chars):
                # Check if between two CJK characters → skip the space
                prev = chars[i - 1] if i > 0 else ''
                nxt = chars[i + 1]
                if prev and unicodedata.category(prev).startswith('Lo') and unicodedata.category(nxt).startswith('Lo'):
                    i += 1
                    continue
            result.append(c)
            i += 1
        return ''.join(result)

    for para in paras:
        text = para["text"]
        normalized = normalize(text)

        for pattern, conf in PATTERNS:
            matches = re.findall(pattern, normalized)
            if not matches:
                continue

            # For groups pattern, join groups
            if isinstance(matches[0], tuple):
                match_text = "".join(matches[0])
            else:
                match_text = matches[0]

            if match_text in seen:
                continue
            seen.add(match_text)

            # Boost confidence if large font (title) or centered
            adjusted = conf
            if para["max_font_pt"] >= 16:
                adjusted = min(1.0, adjusted + 0.08)
            if para["is_centered"]:
                adjusted = min(1.0, adjusted + 0.05)

            if adjusted > best["confidence"]:
                best = {
                    "detected": True,
                    "name": match_text,
                    "confidence": round(adjusted, 3),
                    "matched_text": text[:100],
                }

    # Check known short names (use normalized text too)
    if not best["detected"]:
        for para in paras:
            text = para["text"]
            normalized = normalize(text)
            for short, full in KNOWN_SHORT_NAMES.items():
                if short in normalized:
                    best = {
                        "detected": True,
                        "name": full,
                        "confidence": 0.70,
                        "matched_text": text[:100],
                    }
                    break
            if best["detected"]:
                break

    return best


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"detected": False, "name": None, "confidence": 0, "matched_text": None, "error": "Usage: detect_school.py <file.docx>"}))
        sys.exit(0)

    doc_path = sys.argv[1]
    try:
        paras = extract_cover_text(doc_path)
        result = detect_school(paras)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"detected": False, "name": None, "confidence": 0, "matched_text": None, "error": str(e)}))
        sys.exit(0)


if __name__ == "__main__":
    main()
