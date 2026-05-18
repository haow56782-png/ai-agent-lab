export interface ToolDefinition {
    /** Tool name — used by LLM to invoke */
    name: string;
    /** Description — tells LLM when to use this tool */
    description: string;
    /** JSON Schema for parameters */
    parameters: Record<string, unknown>;
}
export interface ToolContext {
    projectRoot: string;
    designSystemPath: string;
    /** Injected file system interface — allows testability */
    fs?: {
        readFile(path: string): Promise<string>;
    };
    /** Tool execution timeout in milliseconds (0 or undefined = no timeout). */
    toolTimeoutMs?: number;
    [key: string]: unknown;
}
export type ToolHandler = (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>;
export declare function registerTool(def: ToolDefinition, handler: ToolHandler): void;
export declare function getToolDefinitions(): ToolDefinition[];
/** Format tools into a system-message block for the LLM */
export declare function renderToolInstructions(): string;
export declare function executeToolCall(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<string>;
//# sourceMappingURL=index.d.ts.map