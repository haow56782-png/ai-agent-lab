/** ============================================================
 *  ADR Store — In-memory ADR storage with query support.
 *  ============================================================ */
export class InMemoryAdrStore {
    records = new Map();
    async save(adr) {
        this.records.set(adr.metadata.id, { ...adr });
    }
    async get(id) {
        return this.records.get(id) ?? null;
    }
    async getAll() {
        return [...this.records.values()];
    }
    async getByCategory(category) {
        return [...this.records.values()].filter((r) => r.metadata.category === category);
    }
    async getByModule(module) {
        return [...this.records.values()].filter((r) => r.moduleBoundaries.some((b) => b.includes(module)) ||
            r.impacts.some((i) => i.module.includes(module)));
    }
    async getLatestFinal() {
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
//# sourceMappingURL=adr-store.js.map