import { describe, expect, it } from "vitest";
import { normalizeDocumentFilename } from "../src/utils/document-filename.js";

describe("normalizeDocumentFilename", () => {
  it("repairs latin1 mojibake Chinese filenames", () => {
    expect(normalizeDocumentFilename("å°å·å¤§å­¦æ¬ç§çè®ºæ.docx")).toBe("兰州大学本科生论文.docx");
  });

  it("keeps already-correct unicode filenames unchanged", () => {
    expect(normalizeDocumentFilename("中国科学技术大学本科毕业论文.docx")).toBe("中国科学技术大学本科毕业论文.docx");
  });

  it("strips path segments while preserving the repaired basename", () => {
    expect(normalizeDocumentFilename("C:\\fakepath\\å°å·å¤§å­¦æ¬ç§çè®ºæ.docx")).toBe("兰州大学本科生论文.docx");
  });
});
