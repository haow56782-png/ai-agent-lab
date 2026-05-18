/** ============================================================
 *  Memory & Session Intelligence — Types
 *
 *  Three-layer memory architecture:
 *    Session   — current session state (ephemeral)
 *    Episodic  — notable past events (persistent)
 *    Semantic  — long-term knowledge (persistent)
 *
 *  MemoryStore is abstracted behind an interface so it can
 *  be backed by in-memory, file, SQLite, Postgres, etc.
 *  playerId is the primary identity key — NOT sessionId.
 *  ============================================================ */
export {};
//# sourceMappingURL=types.js.map