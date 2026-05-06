import { describe, it, expect } from "vitest";
import { executeToolCall, getToolDefinitions } from "../src/tools/index.js";
import { MockFsAdapter, NodeFsAdapter } from "../src/tools/fs-adapter.js";
// Side-effect imports trigger tool registration
import "../src/tools/design-system.js";
import "../src/tools/game-prediction.js";

const DS_ROOT = "/test-design-system";

const mockFs = new MockFsAdapter({
  [join(DS_ROOT, "design-system/tokens/colors.css")]: [
    "--vib-color-primary: #4E41FF;",
    "--vib-color-bg-primary: #FFFFFF;",
    "--vib-color-bg-secondary: #F5F5F7;",
  ].join("\n"),
  [join(DS_ROOT, "design-system/tokens/typography.css")]: [
    "--vib-font-cn: HarmonyOS Sans SC;",
    "--vib-font-en: Inter;",
  ].join("\n"),
  [join(DS_ROOT, "design-system/tokens/spacing.css")]: [
    "--vib-spacing-xs: 4px;",
    "--vib-spacing-sm: 8px;",
    "--vib-spacing-md: 16px;",
    "--vib-spacing-lg: 24px;",
  ].join("\n"),
  [join(DS_ROOT, "design-system/brand.md")]: "# VIB Brand\n\nVIB is an AI game prediction platform.",
});

import { join } from "node:path";

describe("ToolContext — fs adapter", () => {
  describe("MockFsAdapter", () => {
    it("should read a file that exists", async () => {
      const content = await mockFs.readFile(
        join(DS_ROOT, "design-system/tokens/colors.css"),
      );
      expect(content).toContain("--vib-color-primary");
    });

    it("should throw ENOENT for missing file", async () => {
      await expect(
        mockFs.readFile("/nonexistent/path.css"),
      ).rejects.toThrow("ENOENT");
    });

    it("should support setFile for dynamic content", async () => {
      const custom = new MockFsAdapter();
      custom.setFile("/tmp/test.txt", "hello");
      await expect(custom.readFile("/tmp/test.txt")).resolves.toBe("hello");
    });
  });

  describe("NodeFsAdapter", () => {
    it("should be importable and not crash on init", () => {
      expect(NodeFsAdapter).toBeDefined();
      expect(typeof NodeFsAdapter.readFile).toBe("function");
    });
  });

  describe("read_design_tokens with mock fs", () => {
    it("should return all token categories", async () => {
      const result = await executeToolCall(
        "read_design_tokens",
        { category: "all" },
        { projectRoot: DS_ROOT, designSystemPath: DS_ROOT, fs: mockFs },
      );

      expect(result).toContain("Brand");
      expect(result).toContain("Colors");
      expect(result).toContain("Typography");
      expect(result).toContain("Spacing");
    });

    it("should return only colors when category=colors", async () => {
      const result = await executeToolCall(
        "read_design_tokens",
        { category: "colors" },
        { projectRoot: DS_ROOT, designSystemPath: DS_ROOT, fs: mockFs },
      );

      expect(result).toContain("Colors");
      expect(result).toContain("--vib-color-primary");
      expect(result).not.toContain("Typography");
      expect(result).not.toContain("Brand");
    });

    it("should return only brand when category=brand", async () => {
      const result = await executeToolCall(
        "read_design_tokens",
        { category: "brand" },
        { projectRoot: DS_ROOT, designSystemPath: DS_ROOT, fs: mockFs },
      );

      expect(result).toContain("Brand");
      expect(result).toContain("VIB is an AI game prediction platform");
      expect(result).not.toContain("Colors");
    });

    it("should handle missing files gracefully (empty strings)", async () => {
      const emptyFs = new MockFsAdapter();
      const result = await executeToolCall(
        "read_design_tokens",
        { category: "all" },
        {
          projectRoot: "/empty",
          designSystemPath: "/empty",
          fs: emptyFs,
        },
      );

      // All files missing → all sections should render with 0 tokens
      expect(result).toContain("## Brand");
      expect(result).toContain("## Colors (0 tokens)");
      expect(result).toContain("## Typography (0 tokens)");
      expect(result).toContain("## Spacing (0 tokens)");
    });
  });

  describe("generate_component_css", () => {
    it("should not require fs (pure string generation)", async () => {
      const result = await executeToolCall(
        "generate_component_css",
        { component: "modal", variant: "secondary" },
        { projectRoot: "/", designSystemPath: "/" },
      );

      expect(result).toContain(".vib-modal");
      expect(result).toContain("var(--vib-color-bg-secondary)");
      expect(result).toContain("var(--vib-radius-lg)");
    });
  });

  describe("mock fs replaceability", () => {
    it("should return different results with different mock fs instances", async () => {
      const redTheme = new MockFsAdapter({
        [join("/a", "design-system/tokens/colors.css")]:
          "--vib-color-primary: #FF0000;\n",
        [join("/a", "design-system/tokens/typography.css")]: "",
        [join("/a", "design-system/tokens/spacing.css")]: "",
        [join("/a", "design-system/brand.md")]: "",
      });
      const blueTheme = new MockFsAdapter({
        [join("/b", "design-system/tokens/colors.css")]:
          "--vib-color-primary: #0000FF;\n",
        [join("/b", "design-system/tokens/typography.css")]: "",
        [join("/b", "design-system/tokens/spacing.css")]: "",
        [join("/b", "design-system/brand.md")]: "",
      });

      const [red, blue] = await Promise.all([
        executeToolCall(
          "read_design_tokens",
          { category: "colors" },
          { projectRoot: "/a", designSystemPath: "/a", fs: redTheme },
        ),
        executeToolCall(
          "read_design_tokens",
          { category: "colors" },
          { projectRoot: "/b", designSystemPath: "/b", fs: blueTheme },
        ),
      ]);

      expect(red).toContain("#FF0000");
      expect(blue).toContain("#0000FF");
      expect(red).not.toBe(blue);
    });
  });
});
