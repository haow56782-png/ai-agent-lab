import { describe, it, expect } from "vitest";
import { getToolDefinitions } from "../../src/tools/index.js";
// Side-effect import triggers tool registration
import "../../src/tools/design-system.js";
import "../../src/tools/game-prediction.js";

describe("Design System Capability", () => {
  it("should have design system tools registered", () => {
    const defs = getToolDefinitions();
    const readTool = defs.find((t) => t.name === "read_design_tokens");
    const genTool = defs.find((t) => t.name === "generate_component_css");

    expect(readTool).toBeDefined();
    expect(readTool!.description).toContain("design token");
    expect(genTool).toBeDefined();
    expect(genTool!.parameters.properties).toHaveProperty("component");
  });

  it("should generate component CSS with correct radius for buttons", async () => {
    const { executeToolCall } = await import("../../src/tools/index.js");
    const css = await executeToolCall("generate_component_css", { component: "button", variant: "primary" }, {
      projectRoot: process.cwd(),
      designSystemPath: process.cwd(),
    });

    expect(css).toContain(".vib-button");
    expect(css).toContain("var(--vib-");
    // Button should use --vib-radius-xl (30px)
    expect(css).toContain("--vib-radius-xl");
  });

  it("should generate card CSS with small radius", async () => {
    const { executeToolCall } = await import("../../src/tools/index.js");
    const css = await executeToolCall("generate_component_css", { component: "card", variant: "default" }, {
      projectRoot: process.cwd(),
      designSystemPath: process.cwd(),
    });

    expect(css).toContain(".vib-card");
    // Card should use --vib-radius-sm (12px)
    expect(css).toContain("--vib-radius-sm");
  });
});
