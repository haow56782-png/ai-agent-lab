import type { Database } from "../db.js";
import type { TraceSpanRecord } from "../types.js";

export class TraceSpanRepository {
  constructor(private db: Database) {}

  async init(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS trace_spans (
        id TEXT PRIMARY KEY,
        trace_id TEXT NOT NULL,
        span_id TEXT NOT NULL,
        parent_span_id TEXT,
        name TEXT NOT NULL,
        start_ms REAL NOT NULL,
        end_ms REAL,
        duration_ms REAL,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_trace_spans_trace ON trace_spans(trace_id)",
    );
  }

  async save(span: TraceSpanRecord): Promise<void> {
    await this.db.run(
      `INSERT INTO trace_spans (id, trace_id, span_id, parent_span_id, name, start_ms, end_ms, duration_ms, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        span.id,
        span.traceId,
        span.spanId,
        span.parentSpanId ?? null,
        span.name,
        span.startMs,
        span.endMs ?? null,
        span.durationMs ?? null,
        span.metadata ?? null,
      ],
    );
  }

  async queryRecent(limit = 50): Promise<TraceSpanRecord[]> {
    const rows = await this.db.all<{
      id: string;
      trace_id: string;
      span_id: string;
      parent_span_id: string | null;
      name: string;
      start_ms: number;
      end_ms: number | null;
      duration_ms: number | null;
      metadata: string | null;
    }>("SELECT * FROM trace_spans ORDER BY created_at DESC LIMIT ?", [limit]);
    return rows.map((r) => ({
      id: r.id,
      traceId: r.trace_id,
      spanId: r.span_id,
      parentSpanId: r.parent_span_id ?? undefined,
      name: r.name,
      startMs: r.start_ms,
      endMs: r.end_ms ?? undefined,
      durationMs: r.duration_ms ?? undefined,
      metadata: r.metadata ?? undefined,
    }));
  }

  async queryByTraceId(traceId: string): Promise<TraceSpanRecord[]> {
    const rows = await this.db.all<{
      id: string;
      trace_id: string;
      span_id: string;
      parent_span_id: string | null;
      name: string;
      start_ms: number;
      end_ms: number | null;
      duration_ms: number | null;
      metadata: string | null;
    }>(
      "SELECT * FROM trace_spans WHERE trace_id = ? ORDER BY start_ms ASC",
      [traceId],
    );
    return rows.map((r) => ({
      id: r.id,
      traceId: r.trace_id,
      spanId: r.span_id,
      parentSpanId: r.parent_span_id ?? undefined,
      name: r.name,
      startMs: r.start_ms,
      endMs: r.end_ms ?? undefined,
      durationMs: r.duration_ms ?? undefined,
      metadata: r.metadata ?? undefined,
    }));
  }
}
