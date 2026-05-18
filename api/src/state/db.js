/**
 * VIB AI — Database Interface
 *
 * Minimal abstraction over relational databases (SQLite today, Postgres tomorrow).
 * Business code NEVER uses this directly — use StateStore from types.ts.
 *
 * Implementations:
 *   - SqliteDatabase  (production)   → src/state/sqlite-db.ts
 *   - (future) PgDatabase            → src/state/pg-db.ts
 */
export {};
//# sourceMappingURL=db.js.map