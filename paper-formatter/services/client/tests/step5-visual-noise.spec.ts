import { expect, test } from '@playwright/test';
import { bootstrapState, seedAppStatePatch } from './helpers/appState';

function cloneFinding(base: ReturnType<typeof seedAppStatePatch>['parseResults']['findings'][number], index: number) {
  return {
    ...base,
    finding_id: `672fca73-37ac-4276-872f-ca73672fca7${index}`,
    rule_id: `VISUAL_NOISE_${index}`,
    rule_snapshot: {
      ...base.rule_snapshot,
      rule_text: `同段标注去重 ${index}`,
    },
    evidence_spans: [{ ...base.evidence_spans[0], page: 3 }],
    updated_at: `2026-05-12T00:00:0${index}.000Z`,
  };
}

test('Step5 review canvas keeps one paper explanation layer while pending', async ({ page }) => {
  const state = seedAppStatePatch(5);
  const baseFinding = state.parseResults.findings[0];
  state.parseResults.findings = [0, 1, 2, 3].map((index) => cloneFinding(baseFinding, index));

  await bootstrapState(page, state);
  await page.goto('/');
  await page.getByRole('button', { name: '文档对比' }).click();

  await expect(page.getByTestId('diff-paper-page-3')).toBeVisible();
  await expect(page.locator('.finding-anchor')).not.toHaveCount(0);
  await expect(page.locator('.finding-margin-note')).toHaveCount(4);
  await expect(page.locator('.finding-inline-note')).toHaveCount(0);
});
