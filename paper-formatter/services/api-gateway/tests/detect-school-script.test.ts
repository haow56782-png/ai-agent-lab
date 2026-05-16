import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { spawnSync } from "child_process";

const hasPythonDocx = spawnSync("python3", ["-c", "import docx"]).status === 0;
const runIfPythonDocx = hasPythonDocx ? it : it.skip;
const SCRIPT_PATH = path.resolve(__dirname, "../src/parser/detect_school.py");

function buildDocx(paragraphs: string[]): string {
  const dir = mkdtempSync(path.join(tmpdir(), "detect-school-"));
  const docxPath = path.join(dir, "sample.docx");
  const pythonLines = [
    "from docx import Document",
    "import sys",
    "doc = Document()",
  ].concat(
    paragraphs.map((paragraph) => `doc.add_paragraph(${JSON.stringify(paragraph)})`),
    [`doc.save(${JSON.stringify(docxPath)})`],
  );
  const python = pythonLines.join("\n");
  const result = spawnSync("python3", ["-c", python], { encoding: "utf-8" });
  if (result.status !== 0) {
    rmSync(dir, { recursive: true, force: true });
    throw new Error(result.stderr || "failed to build docx fixture");
  }
  return docxPath;
}

function runDetect(docxPath: string) {
  const result = spawnSync("python3", [SCRIPT_PATH, docxPath], { encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || "detect_school.py failed");
  }
  return JSON.parse(result.stdout);
}

describe("detect_school.py", () => {
  runIfPythonDocx("ignores template placeholder copy instead of detecting 学生所属学院", () => {
    const docxPath = buildDocx([
      "1.封面：封面包括校名、毕业论文中文题目、英文题目、作者姓名、导师姓名、学生所属学院和专业名称、学生所在年级等内容。",
    ]);
    try {
      const result = runDetect(docxPath);
      expect(result.detected).toBe(false);
      expect(result.name).toBe(null);
    } finally {
      rmSync(path.dirname(docxPath), { recursive: true, force: true });
    }
  });

  runIfPythonDocx("detects a real school name from cover text", () => {
    const docxPath = buildDocx([
      "北京师范大学学位论文原创性声明",
    ]);
    try {
      const result = runDetect(docxPath);
      expect(result.detected).toBe(true);
      expect(result.name).toBe("北京师范大学");
    } finally {
      rmSync(path.dirname(docxPath), { recursive: true, force: true });
    }
  });

  runIfPythonDocx("detects a school name embedded in a longer thesis rule title", () => {
    const docxPath = buildDocx([
      "兰州大学本科生毕业论文（设计）写作规范（试行）",
      "为规范我校本科生毕业论文（设计）撰写格式，根据学位论文编写的相关标准，特制定本规范。",
      "1.封面：封面包括校名、毕业论文中文题目、英文题目、作者姓名、导师姓名、学生所属学院和专业名称、学生所在年级等内容。",
    ]);
    try {
      const result = runDetect(docxPath);
      expect(result.detected).toBe(true);
      expect(result.name).toBe("兰州大学");
    } finally {
      rmSync(path.dirname(docxPath), { recursive: true, force: true });
    }
  });

  runIfPythonDocx("resolves short aliases from the canonical registry single source", () => {
    const docxPath = buildDocx([
      "中科大本科毕业论文写作规范",
    ]);
    try {
      const result = runDetect(docxPath);
      expect(result.detected).toBe(true);
      expect(result.name).toBe("中国科学技术大学");
    } finally {
      rmSync(path.dirname(docxPath), { recursive: true, force: true });
    }
  });
});
