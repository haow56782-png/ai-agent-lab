// Rule resolver is the only Phase 1 path from ruleId to rulePath.
// It never reads currentPage and never infers rules from document position.
// Missing rules degrade into explicit fallback results with warnings.
// Selectors depend on this module to keep RulePane finding-centric.
import type { FindingRulePath } from '../finding/schema.ts';

export interface RuleDefinition {
  ruleId: string;
  rulePath: FindingRulePath;
  ruleText?: string;
  version?: string;
}

export interface RuleResolveResult {
  ruleId: string;
  rulePath: FindingRulePath;
  source: 'registry' | 'fallback';
  warning?: string;
}

export type RuleRegistry = Record<string, RuleDefinition>;

export function createRuleRegistry(definitions: RuleDefinition[]): RuleRegistry {
  return definitions.reduce<RuleRegistry>((registry, definition) => {
    registry[definition.ruleId] = definition;
    return registry;
  }, {});
}

export function resolveRulePath(ruleId: string, registry: RuleRegistry, fallback?: Partial<FindingRulePath>): RuleResolveResult {
  const definition = registry[ruleId];
  if (definition) {
    return {
      ruleId,
      rulePath: definition.rulePath,
      source: 'registry',
    };
  }

  return {
    ruleId,
    rulePath: {
      packageName: fallback?.packageName || 'Unknown Rule Package',
      section: fallback?.section || 'Unknown Section',
      clause: fallback?.clause || ruleId || 'UNKNOWN_RULE',
      label: fallback?.label || 'Unresolved rule path',
    },
    source: 'fallback',
    warning: `Rule path not found for ruleId "${ruleId}"`,
  };
}
