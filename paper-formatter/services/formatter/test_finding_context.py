from docx_formatter import DiffTracker


def test_diff_tracker_writes_finding_id_from_context():
    tracker = DiffTracker([
        {
            "finding_id": "finding-margin-1",
            "rule_id": "RULE-L2-MARGIN",
            "rule_group": "正文",
            "rule_text": "页边距",
            "rule_description": "版芯与页边距",
        }
    ])

    tracker.add(1, "page_margin", "old", "new", "section")

    assert tracker.diffs[0]["finding_id"] == "finding-margin-1"
    assert tracker.diffs[0]["related_finding_ids"] == ["finding-margin-1"]


if __name__ == "__main__":
    test_diff_tracker_writes_finding_id_from_context()
    print("formatter finding context tests passed")
