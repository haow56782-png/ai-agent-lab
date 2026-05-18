import pg from "pg";
export declare function getPool(): pg.Pool;
export declare function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>>;
export declare function ensureSchema(): Promise<void>;
export declare function closePool(): Promise<void>;
