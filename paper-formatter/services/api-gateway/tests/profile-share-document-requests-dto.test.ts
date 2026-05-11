import { describe, expect, it } from "vitest";
import {
  parseAutoCreateSchoolCommand,
  parseDetectSchoolCommand,
  parseShareReportCommand,
} from "../src/dto/document-requests.js";

// Profile/share DTO tests cover the remaining document request adapters.
// These commands are API-edge specific and intentionally stay outside job/finding DTO files.
// They still reuse legacyDocId naming after parsing.

describe("profile and share document request DTOs", () => {
  it("maps school detection request into a legacy document command", () => {
    expect(parseDetectSchoolCommand({ docId: " doc_abc123 " })).toEqual({
      legacyDocId: "doc_abc123",
    });
  });

  it("maps auto-create school request with optional legacy document identity", () => {
    expect(parseAutoCreateSchoolCommand({
      name: " 中国科学技术大学 ",
      docId: " doc_abc123 ",
    })).toEqual({
      name: "中国科学技术大学",
      legacyDocId: "doc_abc123",
    });
  });

  it("maps share report file ids into legacy document command names", () => {
    expect(parseShareReportCommand({ fileId: "doc_abc123" })).toEqual({
      legacyDocId: "doc_abc123",
      checkResultLegacyDocId: "doc_abc123",
    });
    expect(parseShareReportCommand({ fileId: "doc_abc123", checkResultId: "job_123" })).toEqual({
      legacyDocId: "doc_abc123",
      checkResultLegacyDocId: "job_123",
    });
  });
});
