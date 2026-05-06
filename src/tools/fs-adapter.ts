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
export const NodeFsAdapter: FsAdapter = {
  async readFile(path: string): Promise<string> {
    const { readFile } = await import("node:fs/promises");
    return readFile(path, "utf-8");
  },
};

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
export class MockFsAdapter implements FsAdapter {
  private files = new Map<string, string>();

  constructor(files: Record<string, string> = {}) {
    for (const [key, val] of Object.entries(files)) {
      this.files.set(key, val);
    }
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return content;
  }

  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }
}
