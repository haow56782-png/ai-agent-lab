/**
 * File system adapter — abstracts file I/O for testability.
 *
 * Tools should never import node:fs directly. Instead, they receive an
 * FsAdapter through ToolContext.fs and fall back to NodeFsAdapter.
 *
 * Tests use MockFsAdapter to avoid real disk I/O.
 */
export interface FsAdapter {
    readFile(path: string): Promise<string>;
}
/**
 * Reads from the real filesystem using node:fs/promises.
 * Lazily imports to keep the module side-effect-free at load time.
 */
export declare const NodeFsAdapter: FsAdapter;
/**
 * In-memory mock for testing. Throws ENOENT for unknown paths.
 *
 * ```ts
 * const mock = new MockFsAdapter({
 *   "/root/file.txt": "hello world",
 * });
 * await mock.readFile("/root/file.txt"); // "hello world"
 * await mock.readFile("/missing");        // throws
 * ```
 */
export declare class MockFsAdapter implements FsAdapter {
    private files;
    constructor(files?: Record<string, string>);
    readFile(path: string): Promise<string>;
    setFile(path: string, content: string): void;
}
//# sourceMappingURL=fs-adapter.d.ts.map