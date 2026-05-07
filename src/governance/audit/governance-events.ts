/** ============================================================
 *  Governance Events — Append-only governance event store.
 *  ============================================================ */

import type { GovernanceEvent, AuditAction } from "./audit-types.js";

export class GovernanceEventStore {
  private events: GovernanceEvent[] = [];
  private counter = 0;

  emit(type: AuditAction, actor: string, data: Record<string, unknown> = {}): GovernanceEvent {
    this.counter++;
    const event: GovernanceEvent = {
      id: `GOV-${Date.now().toString(36)}-${String(this.counter).padStart(4, "0")}`,
      timestamp: new Date().toISOString(),
      type,
      actor,
      data,
    };
    this.events.push(event);
    return event;
  }

  getAll(): GovernanceEvent[] {
    return [...this.events];
  }

  getByType(type: AuditAction): GovernanceEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  getByActor(actor: string): GovernanceEvent[] {
    return this.events.filter((e) => e.actor === actor);
  }

  getRange(from: string, to: string): GovernanceEvent[] {
    return this.events.filter((e) => e.timestamp >= from && e.timestamp <= to);
  }

  getLatest(count: number): GovernanceEvent[] {
    return [...this.events].reverse().slice(0, count);
  }

  getStats(): { total: number; byType: Record<string, number>; byActor: Record<string, number> } {
    const byType: Record<string, number> = {};
    const byActor: Record<string, number> = {};

    for (const event of this.events) {
      byType[event.type] = (byType[event.type] ?? 0) + 1;
      byActor[event.actor] = (byActor[event.actor] ?? 0) + 1;
    }

    return { total: this.events.length, byType, byActor };
  }

  clear(): void {
    this.events = [];
    this.counter = 0;
  }
}
