/**
 * ObjectGraph invariant lint for PR #8.
 * This module validates graph-level structure after builder output without
 * throwing. Violations are returned as warning objects so downstream detectors
 * can decide whether to downgrade, ignore, or surface them.
 */
import type {
  CaptionNode,
  CaptionedByEdge,
  ContinuesEdge,
  FigureObject,
  ObjectGraph,
  ObjectGraphEdge,
  ObjectGraphNode,
  ObjectGraphWarning,
  TableObject,
} from "./types.js";

type ObjectGraphLintInput = Pick<ObjectGraph, "nodes" | "edges">;

export function lintObjectGraphInvariants(graph: ObjectGraphLintInput): ObjectGraphWarning[] {
  const warnings: ObjectGraphWarning[] = [];
  const nodeById = buildNodeIndex(graph.nodes, warnings);

  for (const edge of graph.edges) {
    warnings.push(...lintEdgeReferences(edge, nodeById));

    if (isCaptionedByEdge(edge)) {
      warnings.push(...lintCaptionAnchorMonotonicity(edge, nodeById));
    }

    if (isContinuesEdge(edge)) {
      warnings.push(...lintContinuationSchema(edge, nodeById));
    }
  }

  return warnings;
}

function buildNodeIndex(
  nodes: ObjectGraphNode[],
  warnings: ObjectGraphWarning[],
): Map<string, ObjectGraphNode> {
  const nodeById = new Map<string, ObjectGraphNode>();

  for (const node of nodes) {
    if (nodeById.has(node.objectId)) {
      warnings.push(invariantWarning({
        message: `ObjectGraph contains duplicate node id ${node.objectId}.`,
        nodeIds: [node.objectId],
      }));
      continue;
    }
    nodeById.set(node.objectId, node);
  }

  return nodeById;
}

function lintEdgeReferences(
  edge: ObjectGraphEdge,
  nodeById: Map<string, ObjectGraphNode>,
): ObjectGraphWarning[] {
  const warnings: ObjectGraphWarning[] = [];
  if (!nodeById.has(edge.fromObjectId)) {
    warnings.push(invariantWarning({
      message: `ObjectGraph edge ${edge.edgeId} references missing fromObjectId ${edge.fromObjectId}.`,
      nodeIds: [edge.fromObjectId],
      edgeIds: [edge.edgeId],
    }));
  }

  const toObjectId = edgeToObjectId(edge);
  if (toObjectId && !nodeById.has(toObjectId)) {
    warnings.push(invariantWarning({
      message: `ObjectGraph edge ${edge.edgeId} references missing toObjectId ${toObjectId}.`,
      nodeIds: [toObjectId],
      edgeIds: [edge.edgeId],
    }));
  }
  return warnings;
}

function lintCaptionAnchorMonotonicity(
  edge: CaptionedByEdge,
  nodeById: Map<string, ObjectGraphNode>,
): ObjectGraphWarning[] {
  const target = nodeById.get(edge.fromObjectId);
  const caption = nodeById.get(edge.toObjectId);
  if (!target || !isCaptionNode(caption)) return [];

  if (edge.captionKind === "figure") {
    if (!isFigureObject(target)) {
      return [invariantWarning({
        message: `Figure caption edge ${edge.edgeId} points to non-figure node ${target.objectId}.`,
        nodeIds: [target.objectId, caption.objectId],
        edgeIds: [edge.edgeId],
      })];
    }

    if (caption.paragraphIndex <= target.anchorParagraphIndex) {
      return [invariantWarning({
        message: `Figure caption ${caption.objectId} must appear after figure ${target.objectId}.`,
        nodeIds: [target.objectId, caption.objectId],
        edgeIds: [edge.edgeId],
      })];
    }
    return [];
  }

  if (!isTableObject(target)) {
    return [invariantWarning({
      message: `Table caption edge ${edge.edgeId} points to non-table node ${target.objectId}.`,
      nodeIds: [target.objectId, caption.objectId],
      edgeIds: [edge.edgeId],
    })];
  }

  if (caption.paragraphIndex >= target.startParagraphIndex) {
    return [invariantWarning({
      message: `Table caption ${caption.objectId} must appear before table ${target.objectId}.`,
      nodeIds: [target.objectId, caption.objectId],
      edgeIds: [edge.edgeId],
    })];
  }
  return [];
}

function lintContinuationSchema(
  edge: ContinuesEdge,
  nodeById: Map<string, ObjectGraphNode>,
): ObjectGraphWarning[] {
  const continuation = nodeById.get(edge.fromObjectId);
  const main = nodeById.get(edge.toObjectId);
  if (!isTableObject(continuation) || !isTableObject(main)) {
    return [invariantWarning({
      message: `Continuation edge ${edge.edgeId} must connect table nodes.`,
      nodeIds: [edge.fromObjectId, edge.toObjectId],
      edgeIds: [edge.edgeId],
    })];
  }

  if (continuation.schemaFingerprint !== main.schemaFingerprint) {
    return [invariantWarning({
      message: `Continuation edge ${edge.edgeId} links tables with different schema fingerprints.`,
      nodeIds: [continuation.objectId, main.objectId],
      edgeIds: [edge.edgeId],
    })];
  }
  return [];
}

function edgeToObjectId(edge: ObjectGraphEdge): string | undefined {
  return "toObjectId" in edge ? edge.toObjectId : undefined;
}

function invariantWarning(input: {
  message: string;
  nodeIds?: string[];
  edgeIds?: string[];
}): ObjectGraphWarning {
  return {
    code: "invariant_violation",
    message: input.message,
    nodeIds: input.nodeIds,
    edgeIds: input.edgeIds,
    disposition: "warning",
  };
}

function isCaptionedByEdge(edge: ObjectGraphEdge): edge is CaptionedByEdge {
  return edge.edgeType === "captioned_by";
}

function isContinuesEdge(edge: ObjectGraphEdge): edge is ContinuesEdge {
  return edge.edgeType === "continues";
}

function isCaptionNode(node: ObjectGraphNode | undefined): node is CaptionNode {
  return node?.kind === "caption";
}

function isFigureObject(node: ObjectGraphNode | undefined): node is FigureObject {
  return node?.kind === "figure";
}

function isTableObject(node: ObjectGraphNode | undefined): node is TableObject {
  return node?.kind === "table";
}
