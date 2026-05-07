/** ============================================================
 *  ADR Store — In-memory ADR storage with query support.
 *  ============================================================ */

import type { ArchitectureDecisionRecord, AdrCategory, AdrStore } from "./types.js";

export class InMemoryAdrStore implements AdrStore {
  private records: Map<string, ArchitectureDecisionRecord> = new Map();

  async save(adr: ArchitectureDecisionRecord): Promise<void> {
    this.records.set(adr.metadata.id, { ...adr });
  }

  async get(id: string): Promise<ArchitectureDecisionRecord | null> {
    return this.records.get(id) ?? null;
  }

  async getAll(): Promise<ArchitectureDecisionRecord[]> {
    return [...this.records.values()];
  }

  async getByCategory(category: AdrCategory): Promise<ArchitectureDecisionRecord[]> {
    return [...this.records.values()].filter((r) => r.metadata.category === category);
  }

  async getByModule(module: string): Promise<ArchitectureDecisionRecord[]> {
    return [...this.records.values()].filter((r) =>
      r.moduleBoundaries.some((b) => b.includes(module)) ||
      r.impacts.some((i) => i.module.includes(module)),
    );
  }

  async getLatestFinal(): Promise<ArchitectureDecisionRecord | null> {
    const finalized = [...this.records.values()]
      .filter((r) => r.metadata.status === "final")
      .sort((a, b) => {
        const aTime = a.metadata.finalizedAt ?? a.metadata.createdAt;
        const bTime = b.metadata.finalizedAt ?? b.metadata.createdAt;
        return bTime.localeCompare(aTime);
      });
    return finalized[0] ?? null;
  }
}
