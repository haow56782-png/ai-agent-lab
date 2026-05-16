from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

from docx_formatter import normalize_floating_anchor


def test_watermark_anchor_moves_behind_text():
    anchor = parse_xml(
        f'<wp:anchor {nsdecls("wp")} behindDoc="0" allowOverlap="1">'
        f'  <wp:wrapNone />'
        f"</wp:anchor>"
    )
    mode = normalize_floating_anchor(anchor, True)
    assert mode == "behind_text"
    assert anchor.get("behindDoc") == "1"
    assert anchor.get("allowOverlap") == "0"


def test_regular_image_anchor_switches_to_top_and_bottom():
    anchor = parse_xml(
        f'<wp:anchor {nsdecls("wp")} behindDoc="0" allowOverlap="1">'
        f'  <wp:wrapNone />'
        f"</wp:anchor>"
    )
    mode = normalize_floating_anchor(anchor, False)
    assert mode == "top_and_bottom"
    assert anchor.get("behindDoc") == "0"
    assert anchor.get("allowOverlap") == "0"
    wrap_children = [child for child in anchor if child.tag.endswith("wrapTopAndBottom")]
    assert len(wrap_children) == 1


if __name__ == "__main__":
    test_watermark_anchor_moves_behind_text()
    test_regular_image_anchor_switches_to_top_and_bottom()
    print("floating object overlap formatter tests passed")
