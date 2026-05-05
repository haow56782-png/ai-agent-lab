/**
 * VIB AI — Design Token Skill
 *
 * Queries and transforms design system tokens from the Figma-extracted
 * token files (colors.css, typography.css, spacing.css).
 *
 * Usage:
 *   tsx skills/design-token.ts read colors
 *   tsx skills/design-token.ts transform colors tailwind
 *   tsx skills/design-token.ts generate button primary
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = join(__dirname, "..", "design-system", "tokens");

async function main() {
  const action = process.argv[2] ?? "read";
  const category = process.argv[3] ?? "colors";
  const format = process.argv[4] ?? "css";

  const fileMap: Record<string, string> = {
    colors: "colors.css",
    typography: "typography.css",
    spacing: "spacing.css",
  };

  const file = fileMap[category];
  if (!file) {
    console.error(`Unknown category: ${category}. Use: colors, typography, spacing`);
    process.exit(1);
  }

  const content = await readFile(join(TOKENS_DIR, file), "utf-8");

  if (action === "read") {
    console.log(content);
  } else if (action === "transform") {
    const tokens = parseCSSVariables(content);
    switch (format) {
      case "json":
        console.log(JSON.stringify(tokens, null, 2));
        break;
      case "tailwind":
        console.log(toTailwindConfig(tokens));
        break;
      default:
        console.log(content);
    }
  } else {
    console.error(`Unknown action: ${action}`);
    process.exit(1);
  }
}

function parseCSSVariables(css: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const regex = /--([\w-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    const value = match[2]!.trim();
    if (!value.startsWith("var(")) {
      vars[match[1]!] = value;
    }
  }
  return vars;
}

function toTailwindConfig(tokens: Record<string, string>): string {
  const lines = ["// Auto-generated from VIB design tokens", "module.exports = {", "  theme: {", "    extend: {"];
  const colorKeys = Object.keys(tokens).filter((k) => k.includes("color") || k.match(/^(vib-)?(primary|secondary|bg|text|border)/));
  if (colorKeys.length > 0) {
    lines.push("      colors: {");
    for (const k of colorKeys) {
      lines.push(`        '${k}': '${tokens[k]}',`);
    }
    lines.push("      },");
  }
  lines.push("    }", "  }", "};");
  return lines.join("\n");
}

main().catch(console.error);
