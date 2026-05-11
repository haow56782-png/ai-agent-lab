import { describe, expect, it } from "vitest";
import {
  parseAnalyzeJobCommand,
  parseFixJobCommand,
  parseFormatJobCommand,
} from "../src/dto/job-document-requests.js";

// Job DTO tests protect legacy document command parsing.
// Public job payloads still use docId at the HTTP edge.
// Parsed commands expose legacyDocId for service orchestration.

describe("job document request DTOs", () => {
  it("maps analyze job request into a legacy document command", () => {
    expect(parseAnalyzeJobCommand({ docId: " doc_abc123 ", profileId: " USTC-vAuto " })).toEqual({
      legacyDocId: "doc_abc123",
      profileId: "USTC-vAuto",
    });
  });

  it("maps format job request without introducing canonical document identity", () => {
    expect(parseFormatJobCommand({
      docId: "doc_abc123",
      jobId: "job_source",
      profileId: "USTC-vAuto",
    })).toEqual({
      legacyDocId: "doc_abc123",
      jobId: "job_source",
      profileId: "USTC-vAuto",
    });
  });

  it("keeps fix job legacy document ids separate from source job ids", () => {
    expect(parseFixJobCommand({
      docId: "doc_abc123",
      jobId: "job_source",
      profileId: "USTC-vAuto",
      selectedFixes: ["margin", "heading"],
    })).toEqual({
      legacyDocId: "doc_abc123",
      jobId: "job_source",
      profileId: "USTC-vAuto",
      fixTypes: undefined,
      selectedFixes: ["margin", "heading"],
    });
  });
});
