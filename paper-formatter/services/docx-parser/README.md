# DOCX Parser Service

Experimental Python parser baseline for extracting DOCX structure used by the paper formatter analyze flow.

## Scope

The parser reads a Word document and emits JSON with:

- document metadata
- section page setup and margins
- paragraphs with run-level font data
- headings
- tables
- inline image dimensions
- detected structures such as cover, abstract, TOC, captions, and references

It also provides a best-effort OLE2 `.doc` fallback so WPS/legacy Word files can fail gracefully with a warning-shaped result.

## Install

```bash
python3 -m pip install -r requirements.txt
```

## Usage

```bash
npm run parse -- /path/to/file.docx
python3 src/parse.py /path/to/file.docx
```

## Test

```bash
npm test
python3 src/test_parse.py
```

## Ownership Boundary

`services/api-gateway` currently invokes parser scripts during analyze jobs. Keep this parser output schema aligned with API gateway parser integration tests before wiring it into production orchestration.
