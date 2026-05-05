import { registerTool } from "./index.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

interface ColorToken {
  name: string;
  value: string;
  usage: string;
}

interface DesignToken {
  colors: ColorToken[];
  typography: Record<string, string>;
  spacing: Record<string, string>;
  brand: string;
}

async function loadDesignTokens(root: string): Promise<DesignToken> {
  const colorsPath = join(root, "design-system/tokens/colors.css");
  const typographyPath = join(root, "design-system/tokens/typography.css");
  const spacingPath = join(root, "design-system/tokens/spacing.css");
  const brandPath = join(root, "design-system/brand.md");

  const [colorsCSS, typographyCSS, spacingCSS, brand] = await Promise.all([
    readFile(colorsPath, "utf-8").catch(() => ""),
    readFile(typographyPath, "utf-8").catch(() => ""),
    readFile(spacingPath, "utf-8").catch(() => ""),
    readFile(brandPath, "utf-8").catch(() => ""),
  ]);

  return {
    colors: parseColors(colorsCSS),
    typography: parseCustomProps(typographyCSS),
    spacing: parseCustomProps(spacingCSS),
    brand,
  };
}

function parseColors(css: string): ColorToken[] {
  const tokens: ColorToken[] = [];
  const regex = /--([\w-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    const name = match[1]!;
    const value = match[2]!.trim();
    // Skip if it contains var() references
    if (!value.startsWith("var(")) {
      tokens.push({ name: `--${name}`, value, usage: "CSS variable" });
    }
  }
  return tokens;
}

function parseCustomProps(css: string): Record<string, string> {
  const props: Record<string, string> = {};
  const regex = /--([\w-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    props[`--${match[1]}`] = match[2]!.trim();
  }
  return props;
}

registerTool(
  {
    name: "read_design_tokens",
    description: "Read VIB AI design tokens (colors, typography, spacing, brand)",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["all", "colors", "typography", "spacing", "brand"],
          description: "Which token category to read",
        },
      },
      required: [],
    },
  },
  async (args, ctx) => {
    const tokens = await loadDesignTokens(ctx.designSystemPath);
    const category = (args.category as string) ?? "all";

    const sections: string[] = [];

    if (category === "all" || category === "brand") {
      sections.push(`## Brand\n${tokens.brand}`);
    }
    if (category === "all" || category === "colors") {
      sections.push(
        `## Colors (${tokens.colors.length} tokens)\n` +
          tokens.colors.map((c) => `  ${c.name}: ${c.value}`).join("\n"),
      );
    }
    if (category === "all" || category === "typography") {
      sections.push(
        `## Typography (${Object.keys(tokens.typography).length} tokens)\n` +
          Object.entries(tokens.typography)
            .map(([k, v]) => `  ${k}: ${v}`)
            .join("\n"),
      );
    }
    if (category === "all" || category === "spacing") {
      sections.push(
        `## Spacing (${Object.keys(tokens.spacing).length} tokens)\n` +
          Object.entries(tokens.spacing)
            .map(([k, v]) => `  ${k}: ${v}`)
            .join("\n"),
      );
    }

    return sections.join("\n\n");
  },
);

registerTool(
  {
    name: "generate_component_css",
    description:
      "Generate VIB-themed CSS for a component using design tokens",
    parameters: {
      type: "object",
      properties: {
        component: {
          type: "string",
          description: "Component name (e.g. button, card, modal)",
        },
        variant: {
          type: "string",
          enum: ["primary", "secondary", "default"],
          description: "Component variant",
        },
      },
      required: ["component"],
    },
  },
  async (args, _ctx) => {
    const component = args.component as string;
    const variant = (args.variant as string) ?? "default";
    const bgVar =
      variant === "primary"
        ? "var(--vib-color-primary)"
        : variant === "secondary"
          ? "var(--vib-color-bg-secondary)"
          : "var(--vib-color-bg-tertiary)";
    const textVar =
      variant === "primary"
        ? "var(--vib-color-text-on-primary)"
        : "var(--vib-color-text-primary)";

    // Component-specific radius (from Figma tokens)
    const radiusMap: Record<string, string> = {
      button: "var(--vib-radius-xl)",
      card: "var(--vib-radius-sm)",
      modal: "var(--vib-radius-lg)",
      tag: "var(--vib-radius-xs)",
      badge: "var(--vib-radius-xl)",
    };
    const radius = radiusMap[component] ?? "var(--vib-radius-md)";

    return (
      `.vib-${component} {\n` +
      `  background: ${bgVar};\n` +
      `  color: ${textVar};\n` +
      `  border-radius: ${radius};\n` +
      `  padding: var(--vib-spacing-md) var(--vib-spacing-lg);\n` +
      `  font-family: var(--vib-font-cn);\n` +
      `  font-size: var(--vib-text-md);\n` +
      `}\n`
    );
  },
);
