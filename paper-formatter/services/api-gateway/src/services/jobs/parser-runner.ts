import { spawnSync } from "child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { v4 as uuid } from "uuid";

const DOCX_PARSER_SCRIPT = process.env.DOCX_PARSER_SCRIPT ||
  path.resolve(import.meta.dirname, "../../parser/parse.py");
const PARSER_TEMP_DIR = path.join(os.tmpdir(), "zheng-gao-parser");

function ensureParserTempDir() {
  if (!existsSync(PARSER_TEMP_DIR)) mkdirSync(PARSER_TEMP_DIR, { recursive: true });
}

export function runPythonParser(documentBuffer: Buffer, filename: string): any {
  ensureParserTempDir();
  const fileExtension = path.extname(filename) || ".docx";
  const temporaryDocumentPath = path.join(PARSER_TEMP_DIR, `${uuid().slice(0, 8)}${fileExtension}`);
  try {
    writeFileSync(temporaryDocumentPath, documentBuffer);
    const parserResult = spawnSync("python3", [DOCX_PARSER_SCRIPT, temporaryDocumentPath], {
      encoding: "utf-8",
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (parserResult.error) {
      throw new Error(`Python parser failed: ${parserResult.error.message}`);
    }

    if (parserResult.stderr) {
      console.warn("[docx-parser] stderr:", parserResult.stderr);
    }

    const parserOutput = JSON.parse(parserResult.stdout);
    if (parserOutput.error) {
      throw new Error(`Parser error: ${parserOutput.error}`);
    }

    return parserOutput;
  } finally {
    try { unlinkSync(temporaryDocumentPath); } catch { /* temp file may already be gone */ }
  }
}
