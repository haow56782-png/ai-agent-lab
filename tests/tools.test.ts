import { describe, it, expect } from "vitest";
import { getToolDefinitions, executeToolCall, registerTool } from "../src/tools/index.js";

describe("Tool Registry", () => {
  it("should register and list tools", () => {
    const initialCount = getToolDefinitions().length;

    registerTool(
      {
        name: "test_tool",
        description: "A test tool",
        parameters: { type: "object", properties: { foo: { type: "string" } }, required: [] },
      },
      async () => "ok",
    );

    const defs = getToolDefinitions();
    const tool = defs.find((t) => t.name === "test_tool");
    expect(tool).toBeDefined();
    expect(tool!.description).toBe("A test tool");
  });

  it("should execute registered tool", async () => {
    registerTool(
      {
        name: "echo_tool",
        description: "Echoes args back",
        parameters: {
          type: "object",
          properties: { msg: { type: "string" } },
          required: ["msg"],
        },
      },
      async (args) => `echo: ${args.msg}`,
    );

    const result = await executeToolCall("echo_tool", { msg: "hello" }, {
      projectRoot: "/",
      designSystemPath: "/",
    });
    expect(result).toBe("echo: hello");
  });

  it("should throw for unknown tool", async () => {
    await expect(
      executeToolCall("nonexistent", {}, { projectRoot: "/", designSystemPath: "/" }),
    ).rejects.toThrow("Unknown tool: nonexistent");
  });

  it("should timeout on slow tool execution", async () => {
    registerTool(
      {
        name: "slow_op",
        description: "Tool for timeout testing",
        parameters: { type: "object", properties: {}, required: [] },
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return "done";
      },
    );

    await expect(
      executeToolCall(
        "slow_op",
        {},
        { projectRoot: "/", designSystemPath: "/", toolTimeoutMs: 50 },
      ),
    ).rejects.toThrow(/timed out/i);
  });

  it("renderToolInstructions should return string", async () => {
    const { renderToolInstructions } = await import("../src/tools/index.js");
    const instructions = renderToolInstructions();
    expect(typeof instructions).toBe("string");
    expect(instructions.length).toBeGreaterThan(0);
  });
});
