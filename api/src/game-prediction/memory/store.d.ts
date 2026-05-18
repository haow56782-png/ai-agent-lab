/** ============================================================
 *  Memory Store — Abstract interface + implementations
 *
 *  InMemoryMemoryStore:  testing / local dev (volatile)
 *  FileMemoryStore:      local persistence (survives restarts)
 *
 *  Both implement the same MemoryStore interface so they
 *  are interchangeable.  playerId is the primary key.
 *  ============================================================ */
import type { MemoryEvent, MemoryStore, PlayerProfile } from "./types.js";
export declare class InMemoryMemoryStore implements MemoryStore {
    private events;
    private profiles;
    appendEvent(event: MemoryEvent): Promise<void>;
    getEventsByPlayer(playerId: string): Promise<MemoryEvent[]>;
    getSessionEvents(sessionId: string): Promise<MemoryEvent[]>;
    getLatestProfile(playerId: string): Promise<PlayerProfile | null>;
    saveProfile(profile: PlayerProfile): Promise<void>;
    replay(playerId: string): Promise<{
        events: MemoryEvent[];
        profile: PlayerProfile | null;
    }>;
}
export declare class FileMemoryStore implements MemoryStore {
    private readonly baseDir;
    private eventsCache;
    private profilesCache;
    private loaded;
    constructor(baseDir: string);
    private ensureDir;
    private eventsPath;
    private profilePath;
    private loadAll;
    private persistProfiles;
    private loadEvents;
    private persistEvents;
    appendEvent(event: MemoryEvent): Promise<void>;
    getEventsByPlayer(playerId: string): Promise<MemoryEvent[]>;
    getSessionEvents(sessionId: string): Promise<MemoryEvent[]>;
    getLatestProfile(playerId: string): Promise<PlayerProfile | null>;
    saveProfile(profile: PlayerProfile): Promise<void>;
    replay(playerId: string): Promise<{
        events: MemoryEvent[];
        profile: PlayerProfile | null;
    }>;
}
//# sourceMappingURL=store.d.ts.map