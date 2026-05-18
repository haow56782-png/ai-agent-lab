/** ============================================================
 *  Governance Events — Append-only governance event store.
 *  ============================================================ */
export class GovernanceEventStore {
    events = [];
    counter = 0;
    emit(type, actor, data = {}) {
        this.counter++;
        const event = {
            id: `GOV-${Date.now().toString(36)}-${String(this.counter).padStart(4, "0")}`,
            timestamp: new Date().toISOString(),
            type,
            actor,
            data,
        };
        this.events.push(event);
        return event;
    }
    getAll() {
        return [...this.events];
    }
    getByType(type) {
        return this.events.filter((e) => e.type === type);
    }
    getByActor(actor) {
        return this.events.filter((e) => e.actor === actor);
    }
    getRange(from, to) {
        return this.events.filter((e) => e.timestamp >= from && e.timestamp <= to);
    }
    getLatest(count) {
        return [...this.events].reverse().slice(0, count);
    }
    getStats() {
        const byType = {};
        const byActor = {};
        for (const event of this.events) {
            byType[event.type] = (byType[event.type] ?? 0) + 1;
            byActor[event.actor] = (byActor[event.actor] ?? 0) + 1;
        }
        return { total: this.events.length, byType, byActor };
    }
    clear() {
        this.events = [];
        this.counter = 0;
    }
}
//# sourceMappingURL=governance-events.js.map