import assert from 'node:assert/strict';
import { resolveRules, validateRule, type WordSystemRule } from '../src/rule-engine.ts';

const gbRule: WordSystemRule = {
  ruleId: 'GB-BODY-001',
  ruleName: '正文',
  ruleSource: 'GB',
  ruleLevel: 'baseline',
  targetObject: '正文',
  condition: 'body paragraph',
  expectedFormat: '宋体 小四',
  priority: 200,
  conflictPolicy: 'warn_and_adopt_higher_priority',
  warningCode: 'RULE_CONFLICT',
  fixable: true,
  autoFixStrategy: 'style_update',
  evidence: 'font',
};

const schoolRule: WordSystemRule = {
  ...gbRule,
  ruleId: 'SCHOOL-BODY-001',
  ruleSource: 'school',
  expectedFormat: '宋体 小四 1.5 倍行距',
  priority: 400,
};

const resolved = resolveRules([gbRule, schoolRule]);
assert.equal(resolved.adoptedRules[0].ruleId, 'SCHOOL-BODY-001');
assert.equal(resolved.warnings.length, 1);
assert.equal(resolved.warnings[0].warningCode, 'RULE_CONFLICT');
assert.deepEqual(validateRule(gbRule), []);

console.log('rule-engine.test.ts passed');

