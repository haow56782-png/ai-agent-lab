# DOCX Parser Baseline Inventory

## 1. Scope

This batch reviews `paper-formatter/services/docx-parser/` and decides whether it should be committed as a service baseline or archived as an experiment.

## 2. Decision

Commit as an experimental parser service baseline.

Reason:

- `paper-formatter/services/api-gateway/tests/parser.test.ts` already references `../../docx-parser/src/parse.py`.
- A clean checkout would miss this parser unless the service directory is committed.
- The parser has standalone Python tests and API gateway integration coverage.
- The parser is part of the documented paper formatter service topology.

## 3. Files

| Path | Type | Decision | Notes |
|---|---|---|---|
| `paper-formatter/services/docx-parser/src/parse.py` | Python parser | commit | Emits metadata, sections, paragraphs, headings, tables, images, and structure JSON. Includes OLE2 `.doc` fallback aligned with the API parser baseline. |
| `paper-formatter/services/docx-parser/src/test_parse.py` | Standalone parser tests | commit | Generates temporary DOCX files and verifies detection behavior. |
| `paper-formatter/services/docx-parser/package.json` | Script wrapper | commit | Provides `npm run parse` and `npm test` convenience commands. |
| `paper-formatter/services/docx-parser/requirements.txt` | Python dependencies | commit | Pins `python-docx` and `olefile`. |
| `paper-formatter/services/docx-parser/README.md` | Service docs | commit | Documents scope, install, usage, tests, and ownership boundary. |
| `paper-formatter/services/docx-parser/src/__pycache__/` | Generated Python cache | remove | Ignored by existing gitignore patterns. |

## 4. Verification

| Gate | Command | Result |
|---|---|---|
| Standalone parser tests | `npm test` in `paper-formatter/services/docx-parser` | 21/21 passed |
| API parser integration | `npm test -- --run tests/parser.test.ts` in `paper-formatter/services/api-gateway` | 8/8 passed |

## 5. Follow-Up

Avoid long-term parser duplication between `services/api-gateway/src/parser/parse.py` and `services/docx-parser/src/parse.py`.

Preferred next architecture step:

1. Choose one canonical parser path.
2. Make API gateway call that canonical path through configuration.
3. Remove duplicate parser copies once deployment packaging is updated.
