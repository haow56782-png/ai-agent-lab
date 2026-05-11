import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import { unlinkSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { tmpdir } from "os";
import { v4 as uuid } from "uuid";

const PARSER_SCRIPT = path.resolve(__dirname, "../../docx-parser/src/parse.py");

describe("Python Parser Integration", () => {
  const tmpDir = path.join(tmpdir(), "zg-test-api");

  beforeAll(() => {
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  });

  function runParser(docxPath: string): any {
    const result = execSync(`python3 "${PARSER_SCRIPT}" "${docxPath}"`, {
      encoding: "utf-8",
      timeout: 15_000,
    });
    return JSON.parse(result);
  }

  function createMinimalDocx(): string {
    const tmpPath = path.join(tmpDir, `${uuid().slice(0, 8)}_test.docx`);
    execSync(
      `python3 -c "
from docx import Document
doc = Document()
doc.add_heading('第一章 测试', level=1)
doc.add_paragraph('测试正文内容')
doc.save('${tmpPath}')
"`,
      { timeout: 10_000 }
    );
    return tmpPath;
  }

  it("parses a valid docx and returns JSON structure", () => {
    const docxPath = createMinimalDocx();
    try {
      const result = runParser(docxPath);
      expect(result).toHaveProperty("metadata");
      expect(result.metadata.paragraphs).toBeGreaterThanOrEqual(1);
      expect(result.metadata.sections).toBeGreaterThanOrEqual(1);
      expect(result).toHaveProperty("headings");
      expect(result).toHaveProperty("structure");
      expect(result).toHaveProperty("paragraphs");
      expect(result).toHaveProperty("sections");
      expect(result).toHaveProperty("tables");
      expect(result).toHaveProperty("images");
    } finally {
      try { unlinkSync(docxPath); } catch { /* ok */ }
    }
  });

  it("detects headings correctly", () => {
    const docxPath = path.join(tmpDir, `${uuid().slice(0, 8)}_h.docx`);
    execSync(
      `python3 -c "
from docx import Document
doc = Document()
doc.add_heading('第一章 绪论', level=1)
doc.add_heading('1.1 背景', level=2)
doc.add_heading('第二章 方法', level=1)
doc.save('${docxPath}')
"`,
      { timeout: 10_000 }
    );
    try {
      const result = runParser(docxPath);
      expect(result.headings.length).toBe(3);
      expect(result.headings[0].level).toBe(1);
      expect(result.headings[0].text).toContain("第一章");
      expect(result.headings[1].level).toBe(2);
    } finally {
      try { unlinkSync(docxPath); } catch { /* ok */ }
    }
  });

  it("returns error for non-existent file", () => {
    expect(() => runParser("/nonexistent/path.docx")).toThrow();
  });

  it("detects figure captions", () => {
    const docxPath = path.join(tmpDir, `${uuid().slice(0, 8)}_fig.docx`);
    execSync(
      `python3 -c "
from docx import Document
doc = Document()
doc.add_paragraph('正文内容')
p = doc.add_paragraph()
p.add_run('图1-1 实验架构').bold = True
doc.save('${docxPath}')
"`,
      { timeout: 10_000 }
    );
    try {
      const result = runParser(docxPath);
      const figs = result.structure.filter((s: any) => s.type === "figure_caption");
      expect(figs.length).toBeGreaterThanOrEqual(1);
    } finally {
      try { unlinkSync(docxPath); } catch { /* ok */ }
    }
  });

  it("detects references section header", () => {
    const docxPath = path.join(tmpDir, `${uuid().slice(0, 8)}_ref.docx`);
    execSync(
      `python3 -c "
from docx import Document
doc = Document()
doc.add_heading('参考文献', level=1)
doc.add_paragraph('[1] Zhang Y, et al. Deep learning. Nature, 2025.')
p2 = doc.add_paragraph()
p2.add_run('[2] Li X. CNN methods. 清华大学学报, 2024.')
doc.save('${docxPath}')
"`,
      { timeout: 10_000 }
    );
    try {
      const result = runParser(docxPath);
      const refs = result.structure.filter((s: any) => s.type === "reference_entry");
      expect(refs.length).toBeGreaterThanOrEqual(2);
      const refSection = result.structure.find((s: any) => s.type === "references_header");
      expect(refSection).toBeTruthy();
    } finally {
      try { unlinkSync(docxPath); } catch { /* ok */ }
    }
  });
});

// ── Analyze Result Format Tests ──
// These validate that the structure items / rule details format
// produced by the backend matches what Step3Parse.tsx expects.

describe("Analyze result format (frontend contract)", () => {
  const tmpDir = path.join(tmpdir(), "zg-test-format");
  const PARSER_SCRIPT = path.resolve(__dirname, "../../docx-parser/src/parse.py");

  beforeAll(() => {
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  });

  function runParser(docxPath: string): any {
    return JSON.parse(execSync(`python3 "${PARSER_SCRIPT}" "${docxPath}"`, {
      encoding: "utf-8",
      timeout: 15_000,
    }));
  }

  function buildParseResult(parseResult: any) {
    const structureItems = parseResult.structure || [];
    const headings = parseResult.headings || [];

    const coverItem = structureItems.find((s: any) => s.type === "cover");
    const abstractItem = structureItems.find((s: any) => s.type === "abstract");
    const tocItem = structureItems.find((s: any) => s.type === "toc");
    const figureCaptions = structureItems.filter((s: any) => s.type === "figure_caption");
    const tableCaptions = structureItems.filter((s: any) => s.type === "table_caption");
    const refEntries = structureItems.filter((s: any) => s.type === "reference_entry");

    return {
      items: [
        { k: "封面",               conf: coverItem?.confidence ?? 0.85, done: true },
        { k: "摘要 / Abstract",    conf: abstractItem?.confidence ?? 0.90, done: true },
        { k: "目录",               conf: tocItem?.confidence ?? 0.88, done: true },
        { k: `一级标题 × ${headings.length}`, conf: headings.length > 0 ? 0.95 : 0.60, done: true },
        { k: `图题 × ${figureCaptions.length}`, conf: figureCaptions.length > 0 ? 0.90 : 0.70, done: true },
        { k: `表题 × ${tableCaptions.length}`, conf: tableCaptions.length > 0 ? 0.92 : 0.70, done: true },
        { k: `参考文献 × ${refEntries.length}`, conf: refEntries.length > 0 ? 0.85 : 0.60, done: true },
      ],
      headings: headings.map((h: any) => ({ text: h.text, level: h.level })),
      figureCount: figureCaptions.length,
      tableCount: tableCaptions.length,
      refCount: refEntries.length,
    };
  }

  it("builds correct items from real parser output", () => {
    const docxPath = path.join(tmpDir, `${uuid().slice(0, 8)}_full.docx`);
    execSync(
      `python3 -c "
from docx import Document
doc = Document()
doc.add_heading('摘要', level=1)
doc.add_paragraph('本文研究深度学习方法。')
doc.add_heading('目录', level=1)
doc.add_heading('第一章 绪论', level=1)
doc.add_paragraph('正文内容。')
doc.add_heading('1.1 背景', level=2)
doc.add_paragraph('背景介绍。')
doc.add_paragraph('图1-1 网络结构')
doc.save('${docxPath}')
"`,
      { timeout: 10_000 }
    );
    try {
      const raw = runParser(docxPath);
      const result = buildParseResult(raw);

      expect(result.items).toHaveLength(7);
      expect(result.items[3].k).toContain("一级标题"); // 摘要+目录+第一章+1.1 = 4
      expect(result.items[4].conf).toBeGreaterThan(0.8); // 图1-1 被检测为 caption
      expect(result.headings.length).toBeGreaterThanOrEqual(3);
      expect(result.headings[0].level).toBe(1);
      expect(result.items[3].conf).toBeGreaterThan(0.9);
    } finally {
      try { unlinkSync(docxPath); } catch { /* ok */ }
    }
  });

  it("handles empty document gracefully", () => {
    const raw = {
      metadata: { paragraphs: 0, tables: 0, sections: 1 },
      paragraphs: [],
      headings: [],
      tables: [],
      images: [],
      structure: [],
    };
    const result = buildParseResult(raw);

    expect(result.items.every((it: any) => it.conf !== null)).toBe(true);
    expect(result.items[3].k).toBe("一级标题 × 0"); // Zero headings found
    expect(result.items[3].conf).toBe(0.60); // Low confidence
    expect(result.headings).toHaveLength(0);
  });

  it("items match step3 state shape", () => {
    const result = buildParseResult({
      metadata: { paragraphs: 5, tables: 1, sections: 1 },
      headings: [{ text: "第一章", level: 1 }],
      tables: [],
      images: [],
      structure: [
        { type: "cover", confidence: 0.99 },
        { type: "heading", confidence: 0.95 },
      ],
    });

    // Step3Parse.tsx expects: { k: string; conf: number | null; done: boolean }
    for (const item of result.items) {
      expect(item).toHaveProperty("k");
      expect(typeof item.k).toBe("string");
      expect(item).toHaveProperty("conf");
      expect(typeof item.conf).toBe("number");
      expect(item).toHaveProperty("done");
      expect(item.done).toBe(true);
    }
  });
});
