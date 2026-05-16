/**
 * PR #5 ObjectGraph snapshot fixture tests.
 * These tests validate the generated JSON fixtures as portable regression
 * baselines without requiring local access to the original DOCX files.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  OBJECT_GRAPH_SCHEMA_VERSION,
  type ObjectGraph,
} from "../src/parser/object-graph/types.js";

const FIXTURE_DIR = path.resolve(process.cwd(), "tests/fixtures/object-graph");
const EXPECTED_FIXTURE_COUNTS = new Map([
  ["2. 北京师范大学学位论文word版参考模板（一）.docx.object-graph.json", { nodes: 45, edges: 41, warnings: 2 }],
  ["cafa-probe-figure-caption.docx.docx.object-graph.json", { nodes: 6, edges: 4, warnings: 0 }],
  ["cafa-probe-watermark-layer.docx.docx.object-graph.json", { nodes: 14, edges: 11, warnings: 0 }],
]);

describe("ObjectGraph snapshot fixtures", () => {
  it("contains the three owner-provided real DOCX snapshots", () => {
    expect(fixtureNames()).toEqual([...EXPECTED_FIXTURE_COUNTS.keys()].sort());
  });

  it("keeps snapshots portable and schema-compatible", () => {
    for (const [name, graph] of loadFixtures()) {
      const expected = EXPECTED_FIXTURE_COUNTS.get(name);
      expect(graph.schemaVersion).toBe(OBJECT_GRAPH_SCHEMA_VERSION);
      expect(graph.source.parser).toBe("docx-xml");
      expect(graph.source.generatedAt).toBe("2026-05-13T00:00:00.000Z");
      expect(graph.source.docxPath).toBeTruthy();
      expect(path.isAbsolute(graph.source.docxPath || "")).toBe(false);
      expect(graph.source.docxPath || "").not.toContain("/");
      expect(graph.nodes).toHaveLength(expected?.nodes ?? 0);
      expect(graph.edges).toHaveLength(expected?.edges ?? 0);
      expect(graph.warnings).toHaveLength(expected?.warnings ?? 0);
    }
  });

  it("has unique node and edge ids with all graph references resolvable", () => {
    for (const [, graph] of loadFixtures()) {
      const nodeIds = graph.nodes.map((node) => node.objectId);
      const edgeIds = graph.edges.map((edge) => edge.edgeId);
      expect(new Set(nodeIds).size).toBe(nodeIds.length);
      expect(new Set(edgeIds).size).toBe(edgeIds.length);

      const nodeIdSet = new Set(nodeIds);
      const edgeIdSet = new Set(edgeIds);
      for (const edge of graph.edges) {
        expect(nodeIdSet.has(edge.fromObjectId)).toBe(true);
        if ("toObjectId" in edge && edge.toObjectId) {
          expect(nodeIdSet.has(edge.toObjectId)).toBe(true);
        }
      }
      for (const entry of graph.paragraphIndex) {
        for (const nodeId of entry.nodeIds) expect(nodeIdSet.has(nodeId)).toBe(true);
        for (const edgeId of entry.edgeIds) expect(edgeIdSet.has(edgeId)).toBe(true);
      }
      for (const warning of graph.warnings) {
        for (const nodeId of warning.nodeIds || []) expect(nodeIdSet.has(nodeId)).toBe(true);
        for (const edgeId of warning.edgeIds || []) expect(edgeIdSet.has(edgeId)).toBe(true);
      }
    }
  });
});

function fixtureNames(): string[] {
  return readdirSync(FIXTURE_DIR).filter((name) => name.endsWith(".json")).sort();
}

function loadFixtures(): Array<[string, ObjectGraph]> {
  return fixtureNames().map((name) => [
    name,
    JSON.parse(readFileSync(path.join(FIXTURE_DIR, name), "utf8")) as ObjectGraph,
  ]);
}
