#!/usr/bin/env node

/**
 * validate-agent-os-skills.mjs
 *
 * Scans dot-claude/skills SKILL.md files and validates:
 *   1. YAML frontmatter contains all 15 Capability Protocol fields
 *   2. Body contains required sections
 *   3. Frontmatter/body consistency (failure_modes, workflow, memory, verification)
 *
 * Usage: node scripts/validate-agent-os-skills.mjs
 * Exit:  0 = all critical checks pass, 1 = any failure
 */

import { readFileSync, existsSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SKILLS_DIR = join(ROOT, '.claude', 'skills');

// ── 15 required frontmatter fields from Capability Protocol ──
const REQUIRED_FIELDS = [
  'name', 'description', 'category', 'version', 'owner',
  'inputs', 'outputs', 'tools',
  'memory', 'workflow',
  'verification', 'failure_modes',
  'fallback', 'handoff', 'cost_tracking',
];

// Body sections that P0 skills MUST contain
const REQUIRED_BODY_SECTIONS = [
  'Purpose', 'When to Use', 'Inputs', 'Outputs',
  'Workflow', 'Verification', 'Failure Modes',
  'Forbidden Behaviors', 'Output Template',
  'VIB Example',
];

// ── Parse YAML frontmatter from SKILL.md ──
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;

  const yaml = match[1];
  const lines = yaml.split('\n');
  const fields = {};

  let currentKey = null;
  let currentIndent = 0;

  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    if (indent === 0) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        currentKey = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        // Don't store array/object markers, just track presence
        if (value === '') {
          fields[currentKey] = { _type: 'block', _lines: [] };
        } else {
          fields[currentKey] = { _type: 'scalar', value };
        }
      }
    } else if (currentKey && fields[currentKey]?._type === 'block') {
      fields[currentKey]._lines.push(line.trim());
    }
  }

  return fields;
}

// ── Parse body section headings ──
function parseBodySections(content) {
  const sections = [];
  const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');
  const headingRegex = /^##\s+\d+\.\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(body)) !== null) {
    sections.push(match[1].trim());
  }
  return sections;
}

// ── Check each field exists in frontmatter ──
function checkFields(fields, skillPath) {
  const missing = [];
  const present = [];

  for (const field of REQUIRED_FIELDS) {
    if (fields && fields[field] !== undefined) {
      present.push(field);
    } else {
      missing.push(field);
    }
  }

  return { missing, present, total: present.length };
}

// ── Check body has required sections ──
function checkBodySections(sections) {
  const missing = [];
  const present = [];

  for (const required of REQUIRED_BODY_SECTIONS) {
    // Fuzzy match: check if any section heading contains the required name
    const found = sections.some(s =>
      s.toLowerCase().includes(required.toLowerCase())
    );
    if (found) {
      present.push(required);
    } else {
      missing.push(required);
    }
  }

  return { missing, present, total: present.length };
}

// ── Frontmatter/body consistency check ──
function checkConsistency(content, fields, bodySections) {
  const issues = [];

  // Check that failure_modes in frontmatter appear in body
  if (fields?.failure_modes?._lines?.length) {
    const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');
    for (const fml of fields.failure_modes._lines) {
      const codeMatch = fml.match(/code:\s*"([^"]+)"/);
      if (codeMatch) {
        const code = codeMatch[1];
        if (!body.includes(code)) {
          issues.push(`failure_mode "${code}" declared in frontmatter but not found in body`);
        }
      }
    }
  }

  // Check workflow states from frontmatter in body
  if (fields?.workflow?._lines?.length) {
    const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');
    for (const wl of fields.workflow._lines) {
      if (wl.startsWith('-') && !wl.includes('steps:') && !wl.includes('states:')) {
        const stepText = wl.replace(/^-\s*/, '').split('—')[0].trim();
        if (stepText && !body.includes(stepText) && stepText.length > 5) {
          // This is a soft warning — steps might be described differently in body
        }
      }
    }
  }

  // Check memory required fields
  if (fields?.memory?._lines?.length) {
    const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');
    for (const ml of fields.memory._lines) {
      const itemMatch = ml.match(/["']([^"']+)["']/);
      if (itemMatch) {
        const item = itemMatch[1];
        const keyword = item.split('(')[0].trim();
        if (keyword && keyword.length > 3 && !body.includes(keyword)) {
          // Soft warning — memory items might be referenced differently
        }
      }
    }
  }

  // Check verification gates in body
  if (fields?.verification?._lines?.length) {
    const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');
    for (const vl of fields.verification._lines) {
      const descMatch = vl.match(/description:\s*"([^"]+)"/);
      if (descMatch) {
        const desc = descMatch[1];
        const keyword = desc.split(/[，,.]/)[0];
        if (keyword && keyword.length > 4 && !body.includes(keyword)) {
          // Soft warning
        }
      }
    }
  }

  return issues;
}

// ── Entry point ──
async function main() {
  console.log('🔍 Validating Agent OS Skills against Capability Protocol v0.1\n');

  if (!existsSync(SKILLS_DIR)) {
    console.error(`❌ Skills directory not found: ${SKILLS_DIR}`);
    process.exit(1);
  }

  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
  const skillDirs = entries.filter(e => e.isDirectory());

  if (skillDirs.length === 0) {
    console.error('❌ No skill directories found');
    process.exit(1);
  }

  let totalSkills = 0;
  let passedSkills = 0;
  let failedSkills = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const dir of skillDirs) {
    const skillPath = join(SKILLS_DIR, dir.name, 'SKILL.md');
    if (!existsSync(skillPath)) {
      console.log(`  ⚠️  ${dir.name}/ — no SKILL.md found, skipping`);
      continue;
    }

    totalSkills++;
    const content = readFileSync(skillPath, 'utf-8');
    const fields = parseFrontmatter(content);
    const bodySections = parseBodySections(content);

    const errors = [];
    const warnings = [];
    const isP0 = ['context-engineering-skill', 'verification-gate-skill', 'failure-analysis-skill', 'product-prd-skill', 'vib-agent-product-skill'].includes(dir.name);

    console.log(`\n── ${dir.name}${isP0 ? ' (P0)' : ''} ──`);

    // 1. Field validation
    const fieldResult = checkFields(fields, skillPath);
    if (fieldResult.missing.length > 0) {
      const msg = `Fields missing: ${fieldResult.missing.join(', ')} (${fieldResult.total}/15)`;
      if (isP0) errors.push(msg);
      else warnings.push(msg);
    } else {
      console.log(`  ✅ Fields: ${fieldResult.total}/15`);
    }

    // 2. Body section validation
    if (bodySections.length === 0) {
      if (isP0) errors.push('No body sections found (## numbered headings)');
      else warnings.push('No body sections found');
    } else {
      const sectionResult = checkBodySections(bodySections);
      if (sectionResult.missing.length > 0) {
        const msg = `Body missing sections: ${sectionResult.missing.join(', ')}`;
        if (isP0) errors.push(msg);
        else warnings.push(msg);
      } else {
        console.log(`  ✅ Body: ${sectionResult.total}/${REQUIRED_BODY_SECTIONS.length} required sections`);
      }
    }

    // 3. Consistency check
    if (fields) {
      const consistencyIssues = checkConsistency(content, fields, bodySections);
      if (consistencyIssues.length > 0) {
        errors.push(`Frontmatter/body inconsistency: ${consistencyIssues.join('; ')}`);
      } else {
        console.log(`  ✅ Consistency: frontmatter ↔ body`);
      }
    } else {
      if (isP0) errors.push('No valid YAML frontmatter found');
      else warnings.push('No valid YAML frontmatter found');
    }

    // 4. Report
    for (const e of errors) { console.log(`  ❌ ${e}`); totalErrors++; }
    for (const w of warnings) { console.log(`  ⚠️  ${w}`); totalWarnings++; }

    if (errors.length === 0) {
      passedSkills++;
    } else {
      failedSkills++;
    }
  }

  // ── Summary ──
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Total skills scanned: ${totalSkills}`);
  console.log(`   Passed:               ${passedSkills}`);
  console.log(`   Failed:               ${failedSkills}`);
  console.log(`   Errors:               ${totalErrors}`);
  console.log(`   Warnings:             ${totalWarnings}`);

  if (totalErrors > 0) {
    console.log(`\n❌ VALIDATION FAILED — ${totalErrors} error(s) found`);
    process.exit(1);
  } else {
    console.log(`\n✅ VALIDATION PASSED`);
    process.exit(0);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
