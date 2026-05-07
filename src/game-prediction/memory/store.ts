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
import type { MemoryEvent, MemoryStore, PlayerProfile } from "./types.js";

/* ════════════════════════════════════════════════════════════
   InMemoryMemoryStore — for tests and local dev
   ════════════════════════════════════════════════════════════ */

export class InMemoryMemoryStore implements MemoryStore {
  private events: Map<string, MemoryEvent[]> = new Map();
  private profiles: Map<string, PlayerProfile> = new Map();

  async appendEvent(event: MemoryEvent): Promise<void> {
    const existing = this.events.get(event.playerId) ?? [];
    // Append-only: check for duplicate ID
    if (existing.some((e) => e.id === event.id)) {
      throw new Error(`Duplicate event id: ${event.id}. Events are append-only.`);
    }
    this.events.set(event.playerId, [...existing, event]);
  }

  async getEventsByPlayer(playerId: string): Promise<MemoryEvent[]> {
    const events = this.events.get(playerId) ?? [];
    return [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async getSessionEvents(sessionId: string): Promise<MemoryEvent[]> {
    const all: MemoryEvent[] = [];
    for (const evts of this.events.values()) {
      for (const e of evts) {
        if (e.sessionId === sessionId) all.push(e);
      }
    }
    return all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async getLatestProfile(playerId: string): Promise<PlayerProfile | null> {
    return this.profiles.get(playerId) ?? null;
  }

  async saveProfile(profile: PlayerProfile): Promise<void> {
    this.profiles.set(profile.playerId, { ...profile });
  }

  async replay(playerId: string): Promise<{ events: MemoryEvent[]; profile: PlayerProfile | null }> {
    const events = await this.getEventsByPlayer(playerId);
    const profile = await this.getLatestProfile(playerId);
    return { events, profile };
  }
}

/* ════════════════════════════════════════════════════════════
   FileMemoryStore — persists to JSON files on disk
   ════════════════════════════════════════════════════════════ */

export class FileMemoryStore implements MemoryStore {
  private readonly baseDir: string;
  private eventsCache: Map<string, MemoryEvent[]> = new Map();
  private profilesCache: Map<string, PlayerProfile> = new Map();
  private loaded: boolean = false;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private eventsPath(playerId: string): string {
    return path.join(this.baseDir, `events-${playerId}.json`);
  }

  private profilePath(): string {
    return path.join(this.baseDir, "profiles.json");
  }

  private loadAll(): void {
    if (this.loaded) return;
    this.ensureDir();

    // Load profiles
    const pPath = this.profilePath();
    if (fs.existsSync(pPath)) {
      try {
        const raw = fs.readFileSync(pPath, "utf-8");
        const data = JSON.parse(raw) as Record<string, PlayerProfile>;
        for (const [id, profile] of Object.entries(data)) {
          this.profilesCache.set(id, profile);
        }
      } catch {
        // Corrupted file — start fresh
      }
    }

    this.loaded = true;
  }

  private persistProfiles(): void {
    this.ensureDir();
    const obj: Record<string, PlayerProfile> = {};
    for (const [id, profile] of this.profilesCache) {
      obj[id] = profile;
    }
    fs.writeFileSync(this.profilePath(), JSON.stringify(obj, null, 2), "utf-8");
  }

  private async loadEvents(playerId: string): Promise<MemoryEvent[]> {
    if (this.eventsCache.has(playerId)) {
      return this.eventsCache.get(playerId) ?? [];
    }
    const ePath = this.eventsPath(playerId);
    if (fs.existsSync(ePath)) {
      try {
        const raw = fs.readFileSync(ePath, "utf-8");
        const events = JSON.parse(raw) as MemoryEvent[];
        this.eventsCache.set(playerId, events);
        return events;
      } catch {
        this.eventsCache.set(playerId, []);
        return [];
      }
    }
    this.eventsCache.set(playerId, []);
    return [];
  }

  private persistEvents(playerId: string): void {
    this.ensureDir();
    const events = this.eventsCache.get(playerId) ?? [];
    fs.writeFileSync(this.eventsPath(playerId), JSON.stringify(events, null, 2), "utf-8");
  }

  async appendEvent(event: MemoryEvent): Promise<void> {
    this.loadAll();
    const events = await this.loadEvents(event.playerId);
    if (events.some((e) => e.id === event.id)) {
      throw new Error(`Duplicate event id: ${event.id}. Events are append-only.`);
    }
    const updated = [...events, event];
    this.eventsCache.set(event.playerId, updated);
    this.persistEvents(event.playerId);
  }

  async getEventsByPlayer(playerId: string): Promise<MemoryEvent[]> {
    this.loadAll();
    const events = await this.loadEvents(playerId);
    return [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async getSessionEvents(sessionId: string): Promise<MemoryEvent[]> {
    this.loadAll();
    const all: MemoryEvent[] = [];
    for (const pid of this.eventsCache.keys()) {
      const evts = this.eventsCache.get(pid) ?? [];
      for (const e of evts) {
        if (e.sessionId === sessionId) all.push(e);
      }
    }
    return all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async getLatestProfile(playerId: string): Promise<PlayerProfile | null> {
    this.loadAll();
    return this.profilesCache.get(playerId) ?? null;
  }

  async saveProfile(profile: PlayerProfile): Promise<void> {
    this.loadAll();
    this.profilesCache.set(profile.playerId, { ...profile });
    this.persistProfiles();
  }

  async replay(playerId: string): Promise<{ events: MemoryEvent[]; profile: PlayerProfile | null }> {
    const events = await this.getEventsByPlayer(playerId);
    const profile = await this.getLatestProfile(playerId);
    return { events, profile };
  }
}
