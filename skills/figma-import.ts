/**
 * VIB AI — Figma Import Skill
 *
 * Fetches frame data and renders from the Figma API.
 * Uses the project's Figma file key from environment.
 *
 * Usage:
 *   tsx skills/figma-import.ts frames <page-name>
 *   tsx skills/figma-import.ts render <frame-id>
 */

import "dotenv/config";

const FIGMA_FILE_KEY = "ShtkcPpmxmu6ThHTc2nn3s";
const FIGMA_API = "https://api.figma.com/v1";

async function main() {
  const action = process.argv[2];
  const param = process.argv[3];

  const token = process.env.FIGMA_TOKEN;
  if (!token) {
    console.error("Set FIGMA_TOKEN in .env");
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${token}` };

  switch (action) {
    case "frames": {
      const res = await fetch(`${FIGMA_API}/files/${FIGMA_FILE_KEY}`, { headers });
      const data = await res.json() as { document?: { children?: Array<{ id: string; name: string; type: string }> } };
      const pages = data.document?.children ?? [];
      for (const page of pages) {
        console.log(`${page.type}: ${page.name} (${page.id})`);
      }
      break;
    }
    case "render": {
      if (!param) {
        console.error("Provide frame ID: tsx skills/figma-import.ts render <frame-id>");
        process.exit(1);
      }
      const res = await fetch(
        `${FIGMA_API}/images/${FIGMA_FILE_KEY}?ids=${param}&format=png&scale=2`,
        { headers },
      );
      const data = await res.json() as { images?: Record<string, string> };
      if (data.images) {
        for (const [id, url] of Object.entries(data.images)) {
          console.log(`${id}: ${url}`);
        }
      }
      break;
    }
    default:
      console.log("Usage: tsx skills/figma-import.ts [frames|render] [param]");
  }
}

main().catch(console.error);
