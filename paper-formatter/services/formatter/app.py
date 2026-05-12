"""
Formatter HTTP Service (Flask).

Endpoints:
  POST /format  — Upload DOCX + profile_id, receive formatted DOCX + diff JSON
  GET  /health  — Health check

Run:
  pip install -r requirements.txt
  python app.py                          # dev: default port 5000
  python app.py --port 5001             # custom port
  FORMTER_PORT=5001 python app.py       # env override
"""

import os
import sys
import json
import tempfile
import shutil
from pathlib import Path
from flask import Flask, request, send_file, jsonify

from docx_formatter import DocxFormatter, DEFAULT_RULES

app = Flask(__name__)

# Max upload: 100MB
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024

TEMP_DIR = Path(tempfile.gettempdir()) / "formatter-service"
TEMP_DIR.mkdir(exist_ok=True)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "docx-formatter"})


def _parse_json_form_field(name: str):
    raw = request.form.get(name, None)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise ValueError(f"Invalid {name} JSON")


@app.route("/format", methods=["POST"])
def format_document():
    """Accept DOCX upload + rules, return formatted DOCX + diff JSON."""
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400

    file = request.files["file"]
    if not file.filename or not file.filename.lower().endswith(".docx"):
        return jsonify({"error": "Only .docx files are supported"}), 400

    profile_id = request.form.get("profile_id", "default")
    try:
        rules = _parse_json_form_field("rules")
        finding_context = _parse_json_form_field("finding_context") or []
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    # Save uploaded file to temp (sanitize filename: avoid Chinese chars in path)
    ext = Path(file.filename).suffix if file.filename else ".docx"
    safe_name = f"input_{os.urandom(4).hex()}{ext}"
    input_path = TEMP_DIR / safe_name
    file.save(str(input_path))

    output_path = TEMP_DIR / f"formatted_{os.urandom(4).hex()}{ext}"
    diff_path = TEMP_DIR / f"diff_{os.urandom(4).hex()}.json"

    try:
        # Run formatter
        formatter = DocxFormatter(str(input_path), rules, finding_context=finding_context)
        formatter.format()
        formatter.save(str(output_path))
        diff = formatter.get_diff()

        # Save diff for multipart response
        with open(str(diff_path), "w", encoding="utf-8") as f:
            json.dump(diff, f, ensure_ascii=False, indent=2)

        # Read into memory before sending
        from io import BytesIO

        output_buf = BytesIO()
        with open(str(output_path), "rb") as f:
            output_buf.write(f.read())
        output_buf.seek(0)

        diff_buf = BytesIO()
        with open(str(diff_path), "r", encoding="utf-8") as f:
            diff_buf.write(f.read().encode("utf-8"))
        diff_buf.seek(0)

        # Return as multipart response
        from flask import Response

        boundary = "----FormBoundary7MA4YWxkTrZu0gW"

        def generate():
            # Formatted DOCX
            yield f"--{boundary}\r\n".encode()
            yield b'Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n'
            yield b'Content-Disposition: form-data; name="formatted"; filename="formatted.docx"\r\n\r\n'
            yield output_buf.read()
            yield b"\r\n"

            # Diff JSON
            yield f"--{boundary}\r\n".encode()
            yield b'Content-Type: application/json\r\n'
            yield b'Content-Disposition: form-data; name="diff"; filename="diff.json"\r\n\r\n'
            yield diff_buf.read()
            yield b"\r\n"

            yield f"--{boundary}--\r\n".encode()

        return Response(
            generate(),
            mimetype=f"multipart/form-data; boundary={boundary}",
            status=200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # Cleanup temp files
        for p in [input_path, output_path, diff_path]:
            try:
                if p.exists():
                    p.unlink()
            except OSError:
                pass


@app.route("/format/simple", methods=["POST"])
def format_document_simple():
    """Simpler endpoint: returns formatted DOCX and diff as separate fields.

    Response is a single DOCX binary. Diff is in response headers as X-Diff-Json.
    """
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400

    file = request.files["file"]
    if not file.filename or not file.filename.lower().endswith(".docx"):
        return jsonify({"error": "Only .docx files are supported"}), 400

    rules_json = request.form.get("rules", None)
    try:
        rules = _parse_json_form_field("rules")
        finding_context = _parse_json_form_field("finding_context") or []
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    ext = Path(file.filename).suffix if file.filename else ".docx"
    input_path = TEMP_DIR / f"input_{os.urandom(4).hex()}{ext}"
    output_path = TEMP_DIR / f"formatted_{os.urandom(4).hex()}{ext}"

    file.save(str(input_path))

    try:
        formatter = DocxFormatter(str(input_path), rules, finding_context=finding_context)
        formatter.format()
        formatter.save(str(output_path))
        diff = formatter.get_diff()

        return send_file(
            str(output_path),
            mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            as_attachment=True,
            download_name=f"formatted_{file.filename}",
            headers={"X-Diff-Json": json.dumps(diff, ensure_ascii=False)},
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        for p in [input_path, output_path]:
            try:
                if p.exists():
                    p.unlink()
            except OSError:
                pass


@app.route("/rules/default", methods=["GET"])
def get_default_rules():
    """Return the default formatting rules."""
    return jsonify(DEFAULT_RULES)


if __name__ == "__main__":
    port = int(os.environ.get("FORMATTER_PORT", sys.argv[sys.argv.index("--port") + 1] if "--port" in sys.argv else 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
