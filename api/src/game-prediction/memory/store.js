/** ============================================================
 *  Memory Store — Abstract interface + implementations
 *
 *  InMemoryMemoryStore:  testing / local dev (volatile)
 *  FileMemoryStore:      local persistence (survives restarts)
 *
 *  Both implement the same MemoryStore interface so they
 *  are interchangeable.  playerId is the primary key.
 *  ============================================================ */
import * as fs from "node:fs";
import * as path from "node:path";
/* ════════════════════════════════════════════════════════════
   InMemoryMemoryStore — for tests and local dev
   ════════════════════════════════════════════════════════════ */
export class InMemoryMemoryStore {
    events = new Map();
    profiles = new Map();
    async appendEvent(event) {
        const existing = this.events.get(event.playerId) ?? [];
        // Append-only: check for duplicate ID
        if (existing.some((e) => e.id === event.id)) {
            throw new Error(`Duplicate event id: ${event.id}. Events are append-only.`);
        }
        this.events.set(event.playerId, [...existing, event]);
    }
    async getEventsByPlayer(playerId) {
        const events = this.events.get(playerId) ?? [];
        return [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }
    async getSessionEvents(sessionId) {
        const all = [];
        for (const evts of this.events.values()) {
            for (const e of evts) {
                if (e.sessionId === sessionId)
                    all.push(e);
            }
        }
        return all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }
    async getLatestProfile(playerId) {
        return this.profiles.get(playerId) ?? null;
    }
    async saveProfile(profile) {
        this.profiles.set(profile.playerId, { ...profile });
    }
    async replay(playerId) {
        const events = await this.getEventsByPlayer(playerId);
        const profile = await this.getLatestProfile(playerId);
        return { events, profile };
    }
}
/* ════════════════════════════════════════════════════════════
   FileMemoryStore — persists to JSON files on disk
   ════════════════════════════════════════════════════════════ */
export class FileMemoryStore {
    baseDir;
    eventsCache = new Map();
    profilesCache = new Map();
    loaded = false;
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    ensureDir() {
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }
    eventsPath(playerId) {
        return path.join(this.baseDir, `events-${playerId}.json`);
    }
    profilePath() {
        return path.join(this.baseDir, "profiles.json");
    }
    loadAll() {
        if (this.loaded)
            return;
        this.ensureDir();
        // Load profiles
        const pPath = this.profilePath();
        if (fs.existsSync(pPath)) {
            try {
                const raw = fs.readFileSync(pPath, "utf-8");
                const data = JSON.parse(raw);
                for (const [id, profile] of Object.entries(data)) {
                    this.profilesCache.set(id, profile);
                }
            }
            catch {
                // Corrupted file — start fresh
            }
        }
        this.loaded = true;
    }
    persistProfiles() {
        this.ensureDir();
        const obj = {};
        for (const [id, profile] of this.profilesCache) {
            obj[id] = profile;
        }
        fs.writeFileSync(this.profilePath(), JSON.stringify(obj, null, 2), "utf-8");
    }
    async loadEvents(playerId) {
        if (this.eventsCache.has(playerId)) {
            return this.eventsCache.get(playerId) ?? [];
        }
        const ePath = this.eventsPath(playerId);
        if (fs.existsSync(ePath)) {
            try {
                const raw = fs.readFileSync(ePath, "utf-8");
                const events = JSON.parse(raw);
                this.eventsCache.set(playerId, events);
                return events;
            }
            catch {
                this.eventsCache.set(playerId, []);
                return [];
            }
        }
        this.eventsCache.set(playerId, []);
        return [];
    }
    persistEvents(playerId) {
        this.ensureDir();
        const events = this.eventsCache.get(playerId) ?? [];
        fs.writeFileSync(this.eventsPath(playerId), JSON.stringify(events, null, 2), "utf-8");
    }
    async appendEvent(event) {
        this.loadAll();
        const events = await this.loadEvents(event.playerId);
        if (events.some((e) => e.id === event.id)) {
            throw new Error(`Duplicate event id: ${event.id}. Events are append-only.`);
        }
        const updated = [...events, event];
        this.eventsCache.set(event.playerId, updated);
        this.persistEvents(event.playerId);
    }
    async getEventsByPlayer(playerId) {
        this.loadAll();
        const events = await this.loadEvents(playerId);
        return [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }
    async getSessionEvents(sessionId) {
        this.loadAll();
        const all = [];
        for (const pid of this.eventsCache.keys()) {
            const evts = this.eventsCache.get(pid) ?? [];
            for (const e of evts) {
                if (e.sessionId === sessionId)
                    all.push(e);
            }
        }
        return all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }
    async getLatestProfile(playerId) {
        this.loadAll();
        return this.profilesCache.get(playerId) ?? null;
    }
    async saveProfile(profile) {
        this.loadAll();
        this.profilesCache.set(profile.playerId, { ...profile });
        this.persistProfiles();
    }
    async replay(playerId) {
        const events = await this.getEventsByPlayer(playerId);
        const profile = await this.getLatestProfile(playerId);
        return { events, profile };
    }
}
//# sourceMappingURL=store.js.map