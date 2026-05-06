#!/usr/bin/env node

/**
 * validate-agent-task-report.mjs
 *
 * Validates a task report YAML block against the Task Execution Gate v0.1 spec.
 * Reads from a file path argument or stdin. Exits 0 on valid, 1 on invalid.
 *
 * Usage:
 *   node scripts/validate-agent-task-report.mjs <file>
 *   cat <file> | node scripts/validate-agent-task-report.mjs
 *
 * Required fields:
 *   plan, changed_files, commands_run, verification_result,
 *   test_result, unresolved_risks, next_recommended_action
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const REQUIRED_FIELDS = [
  'plan',
  'changed_files',
  'commands_run',
  'verification_result',
  'test_result',
  'unresolved_risks',
  'next_recommended_action',
];

const VALID_ACTIONS = ['created', 'modified', 'deleted'];
const VALID_VERDICTS = ['PASS', 'PARTIAL', 'FAIL'];

// ── Parse first YAML block from file content ──
function parseYamlBlock(content) {
  const match = content.match(/```yaml\n([\s\S]*?)```/);
  if (!match) return null;

  const yaml = match[1];
  const lines = yaml.split('\n');

  // Two-pass parser.
  // Pass 1: identify which keys are arrays (followed by `- ` items).
  // Pass 2: build the data structure.
  const arrayKeys = new Map(); // "parentKey.childKey" -> true, or "root.childKey" -> true

  // Track indent contexts: each entry is { indent, isArray, key }
  const contexts = [{ indent: -1, isArray: false, key: 'root', obj: null }];

  // Pass 1: find which keys have array items
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (line.trim().startsWith('- ')) {
      // Find owning key: look backwards on parent lines at lower indent
      for (let j = i - 1; j >= 0; j--) {
        const prev = lines[j];
        if (prev.trim() === '' || prev.trim().startsWith('#')) continue;
        if (prev.trim().startsWith('- ')) continue;
        const indent = prev.search(/\S/);
        const trimmed = prev.trim();
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0 && indent < line.search(/\S/)) {
          const key = trimmed.slice(0, colonIdx).trim();
          // Build path
          const pathParts = [];
          let ci = indent;
          for (let k = j - 1; k >= 0; k--) {
            const p = lines[k];
            if (p.trim() === '' || p.trim().startsWith('#')) continue;
            const pi = p.search(/\S/);
            if (pi < ci) {
              const pt = p.trim();
              const pc = pt.indexOf(':');
              if (pc > 0) {
                pathParts.unshift(pt.slice(0, pc).trim());
                ci = pi;
              }
            }
          }
          const fullPath = pathParts.length > 0 ? pathParts.join('.') + '.' + key : key;
          arrayKeys.set(fullPath, true);
          break;
        }
      }
    }
  }

  // Pass 2: build structure
  const data = {};
  const stack = [{ obj: data, indent: -1, path: '' }];

  function isArrayAtPath(path, key) {
    const fullPath = path ? path + '.' + key : key;
    return arrayKeys.has(fullPath);
  }

  for (const raw of lines) {
    if (raw.trim() === '' || raw.trim().startsWith('#')) continue;

    const indent = raw.search(/\S/);
    const trimmed = raw.trim();

    // Pop stack to correct indent level
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1];

    // Array item
    if (trimmed.startsWith('- ')) {
      const rest = trimmed.slice(2).trim();
      // Parent should be an array — ensure it is
      const parent = current.obj;
      // If parent is a plain object, we should be in an array. The key is above.
      // Actually, the parent is the array itself. Find it from stack.

      // The owner of the array is the parent of current.
      if (rest === '') {
        // Object item: `- ` followed by sub-keys on next lines
        const newObj = {};
        // Check if parent is actually an array
        if (Array.isArray(parent)) {
          parent.push(newObj);
          stack.push({ obj: newObj, indent, path: current.path });
        } else {
          // parent is not an array — this is a problem, skip
        }
      } else if (rest.includes(': ')) {
        // Inline object: `- key: value` followed by sub-keys on next lines
        const colonIdx = rest.indexOf(':');
        const k = rest.slice(0, colonIdx).trim();
        const v = rest.slice(colonIdx + 1).trim();
        const newObj = {};
        newObj[k] = parseScalar(v);
        if (Array.isArray(parent)) {
          parent.push(newObj);
          stack.push({ obj: newObj, indent, path: current.path });
        }
      } else {
        // Scalar array item: `- value`
        if (Array.isArray(parent)) {
          parent.push(parseScalar(rest));
        }
      }
      continue;
    }

    // Key-value pair
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx <= 0) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    const newPath = current.path ? current.path + '.' + key : key;

    if (value === '') {
      // Block value — could be object or array
      if (isArrayAtPath(current.path, key)) {
        const arr = [];
        current.obj[key] = arr;
        stack.push({ obj: arr, indent, path: newPath });
      } else {
        const newObj = {};
        current.obj[key] = newObj;
        stack.push({ obj: newObj, indent, path: newPath });
      }
    } else if (value === '[]') {
      current.obj[key] = [];
    } else {
      current.obj[key] = parseScalar(value);
    }
  }

  return data;
}

function parseScalar(value) {
  const numVal = Number(value);
  if (!isNaN(numVal) && value !== '' && value !== 'true' && value !== 'false' && value !== 'null' && value !== 'undefined') {
    return numVal;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

// ── Validate the parsed data ──
function validate(data) {
  const errors = [];

  // 1. Check all required fields exist
  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined || data[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Return early if critical fields are missing (avoid cascading errors)
  if (errors.length > 0) return errors;

  // 2. verification_result.status must be PASS/PARTIAL/FAIL
  const vr = data.verification_result;
  if (typeof vr === 'object') {
    if (!VALID_VERDICTS.includes(vr.status)) {
      errors.push(`verification_result.status must be one of ${VALID_VERDICTS.join(', ')}, got: ${vr.status}`);
    }
    if (typeof vr.total === 'number' && typeof vr.passed === 'number' && typeof vr.failed === 'number') {
      if (vr.passed + vr.failed > vr.total) {
        errors.push(`verification_result: passed (${vr.passed}) + failed (${vr.failed}) > total (${vr.total})`);
      }
    }
  }

  // 3. changed_files must be an array
  if (!Array.isArray(data.changed_files)) {
    errors.push('changed_files must be an array');
  } else {
    for (let i = 0; i < data.changed_files.length; i++) {
      const f = data.changed_files[i];
      if (typeof f === 'object' && f.path) {
        if (!VALID_ACTIONS.includes(f.action)) {
          errors.push(`changed_files[${i}].action must be one of ${VALID_ACTIONS.join(', ')}, got: ${f.action}`);
        }
      } else if (typeof f === 'string') {
        // Simple string format — allow but note it
      } else {
        errors.push(`changed_files[${i}] must have a 'path' field`);
      }
    }
  }

  // 4. commands_run must be an array
  if (!Array.isArray(data.commands_run)) {
    errors.push('commands_run must be an array');
  } else {
    for (let i = 0; i < data.commands_run.length; i++) {
      const c = data.commands_run[i];
      if (typeof c === 'object') {
        if (c.command === undefined) {
          errors.push(`commands_run[${i}] missing 'command' field`);
        }
        if (c.exit_code === undefined) {
          errors.push(`commands_run[${i}] missing 'exit_code' field`);
        }
      } else {
        errors.push(`commands_run[${i}] must be an object with 'command' and 'exit_code'`);
      }
    }
  }

  // 5. unresolved_risks must be an array
  if (!Array.isArray(data.unresolved_risks)) {
    errors.push('unresolved_risks must be an array');
  }

  // 6. test_result must have tests_passed and tests_failed
  const tr = data.test_result;
  if (typeof tr === 'object') {
    if (typeof tr.tests_passed !== 'number') {
      errors.push('test_result.tests_passed must be a number');
    }
    if (typeof tr.tests_failed !== 'number') {
      errors.push('test_result.tests_failed must be a number');
    }
  }

  // 7. next_recommended_action must have action and reason
  const nra = data.next_recommended_action;
  if (typeof nra === 'object') {
    if (!nra.action) {
      errors.push('next_recommended_action.action is required');
    }
    if (!nra.reason) {
      errors.push('next_recommended_action.reason is required');
    }
  }

  return errors;
}

// ── Print per-file result ──
function printResult(label, data, errors) {
  const totalFields = REQUIRED_FIELDS.length;
  const presentFields = REQUIRED_FIELDS.filter(f => data[f] !== undefined && data[f] !== null).length;

  console.log(`📋 ${label}\n`);

  for (const field of REQUIRED_FIELDS) {
    const ok = data[field] !== undefined && data[field] !== null;
    console.log(`  ${ok ? '✅' : '❌'} ${field}`);
  }

  console.log(`\n  Fields: ${presentFields}/${totalFields}`);

  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length} validation error(s):`);
    for (const e of errors) {
      console.log(`   • ${e}`);
    }
    console.log(`\n❌ VALIDATION FAILED`);
  } else {
    console.log(`\n✅ VALIDATION PASSED`);
  }
}

function runFile(filePath) {
  const fullPath = filePath.startsWith('/') ? filePath : join(ROOT, filePath);
  if (!existsSync(fullPath)) {
    console.error(`❌ File not found: ${fullPath}`);
    return { passed: false, errors: [`File not found: ${fullPath}`] };
  }
  const content = readFileSync(fullPath, 'utf-8');
  const data = parseYamlBlock(content);
  if (!data) {
    return { passed: false, errors: ['No YAML code block found (expected ```yaml ... ```)'] };
  }
  const errors = validate(data);
  return { passed: errors.length === 0, errors, data };
}

function classifyFixture(filePath) {
  const name = filePath.toLowerCase();
  if (name.includes('invalid')) return 'invalid';
  if (name.includes('valid')) return 'valid';
  return 'other';
}

// ── Main ──
function main() {
  const args = process.argv.slice(2);

  // No args → stdin mode
  if (args.length === 0) {
    const stdin = readFileSync('/dev/stdin', 'utf-8');
    const data = parseYamlBlock(stdin);
    if (!data) {
      console.error('❌ No YAML code block found (expected ```yaml ... ```)');
      process.exit(1);
    }
    const errors = validate(data);
    printResult('(stdin)', data, errors);
    process.exit(errors.length > 0 ? 1 : 0);
  }

  // Batch mode for 2+ files
  const results = args.map(filePath => {
    const r = runFile(filePath);
    printResult(filePath, r.data || {}, r.errors);
    console.log('');
    return { file: filePath, ...r };
  });

  // Summary block
  const fixtureLabels = {};
  for (const r of results) {
    const type = classifyFixture(r.file);
    fixtureLabels[type] = r.passed;
  }

  // Overall: valid must PASS, invalid must FAIL, others must PASS
  let overallPass = true;
  const summaryLines = [];

  for (const r of results) {
    const type = classifyFixture(r.file);
    if (type === 'valid') {
      const ok = r.passed;
      summaryLines.push(`  valid_fixture: ${ok ? 'PASS' : 'FAIL'}`);
      if (!ok) overallPass = false;
    } else if (type === 'invalid') {
      const ok = !r.passed; // invalid fixture is expected to FAIL
      summaryLines.push(`  invalid_fixture: ${ok ? 'PASS' : 'FAIL'}`);
      if (!ok) overallPass = false;
    } else {
      summaryLines.push(`  ${r.file}: ${r.passed ? 'PASS' : 'FAIL'}`);
      if (!r.passed) overallPass = false;
    }

    if (!r.passed && r.errors) {
      for (const e of r.errors) {
        summaryLines.push(`    failed_check: ${e}`);
      }
    }
  }

  summaryLines.push(`  validation_result: ${overallPass ? 'PASS' : 'FAIL'}`);
  console.log('━━━ Summary ━━━');
  for (const line of summaryLines) {
    console.log(line);
  }

  process.exit(overallPass ? 0 : 1);
}

main();
