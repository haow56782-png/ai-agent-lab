/**
 * VIB AI — Configuration Manager
 *
 * Load order: env var > config file (yaml/json) > defaults
 * env var keys are uppercase with dots replaced by underscores:
 *   LLM_TEMPERATURE → config.get("llm.temperature")
 *   LLM_RETRY_MAX   → config.get("llm.retry.max")
 */
export declare function get<T>(key: string): T;
export declare function getAll(): Record<string, unknown>;
export declare function formatConfig(): string;
//# sourceMappingURL=config.d.ts.map