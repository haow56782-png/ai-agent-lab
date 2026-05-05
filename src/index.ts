import "dotenv/config";
import { createAgent } from "./agent.js";
import { createLLM } from "./llm.js";
import { runWorkflow } from "./workflow.js";
import { createInterface } from "node:readline/promises";

// Register all tools (side-effect imports)
import "./tools/design-system.js";
import "./tools/game-prediction.js";

const MODE = process.argv[2] ?? "repl";

async function main() {
  switch (MODE) {
    case "repl":
      await replMode();
      break;
    case "once":
      await onceMode(process.argv.slice(3).join(" "));
      break;
    case "workflow":
      await workflowMode(process.argv.slice(3).join(" "));
      break;
    case "check":
      await checkMode();
      break;
    default:
      console.log(`Usage: npm run dev [repl|once|workflow|check] [prompt...]`);
  }
}

/** Interactive REPL */
async function replMode() {
  const agent = createAgent();
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log(`╭─────────────────────────────────────────────╮`);
  console.log(`│   VIB AI Agent  v1.0                        │`);
  console.log(`│   Type "exit" to quit, "/tools" to list     │`);
  console.log(`╰─────────────────────────────────────────────╯`);

  while (true) {
    const input = await rl.question("\n❯ ");
    const trimmed = input.trim();

    if (trimmed === "exit" || trimmed === "quit") break;
    if (trimmed === "/tools") {
      const { getToolDefinitions } = await import("./tools/index.js");
      for (const t of getToolDefinitions()) {
        console.log(`  ${t.name} — ${t.description}`);
      }
      continue;
    }
    if (!trimmed) continue;

    const response = await agent.run(trimmed);
    console.log(`\n${response}`);
  }

  rl.close();
}

/** Single-shot mode: run one prompt and print result */
async function onceMode(prompt: string) {
  if (!prompt) {
    console.error("Error: provide a prompt. Usage: npm run dev once <prompt>");
    process.exit(1);
  }
  const agent = createAgent();
  const response = await agent.run(prompt);
  console.log(response);
}

/** Workflow mode: Plan → Execute → Review → Refine */
async function workflowMode(task: string) {
  if (!task) {
    console.error("Error: provide a task. Usage: npm run dev workflow <task>");
    process.exit(1);
  }
  const result = await runWorkflow(task);
  console.log(`\n## Plan\n${result.plan}`);
  console.log(`\n## Output\n${result.output}`);
  console.log(`\n## Review\n${result.review}`);
  if (result.refined) {
    console.log(`\n## Refined\n${result.refined}`);
  }
  console.log(`\n[Stages: ${result.stages}]`);
}

/** Check mode: verify LLM connectivity */
async function checkMode() {
  try {
    const llm = createLLM({ temperature: 0, maxTokens: 128 });
    const reply = await llm.chat([
      { role: "user", content: "Reply with exactly: OK" },
    ]);
    if (reply.trim() === "OK") {
      console.log("✅ LLM connection OK");
    } else {
      console.log(`⚠️  LLM responded but unexpected: ${reply}`);
    }
  } catch (err) {
    console.error("❌ LLM connection failed:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
