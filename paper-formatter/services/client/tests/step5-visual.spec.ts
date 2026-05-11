import { expect, test, type Page } from '@playwright/test';
import { bootstrapState, seedAppStatePatch } from './helpers/appState';

async function stabilizeForVisualBaseline(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.evaluate(() => document.fonts?.ready);
}

test.describe('Step5 visual baselines', () => {
  test('pending confirmation page matches the stable visual baseline', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');
    await stabilizeForVisualBaseline(page);

    await expect(page.getByText('你的正文没有被改动。')).toBeVisible();
    await expect(page.getByTestId('diff-review-panel')).toBeVisible();
    await expect(page).toHaveScreenshot('step5-confirmation-pending.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('completed confirmation page matches the stable visual baseline', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');
    await page.getByRole('button', { name: /全部接受这 3 处/ }).click();
    await page.getByRole('button', { name: '确定全部接受' }).click();
    await stabilizeForVisualBaseline(page);

    await expect(page.getByText('全部确认完成。')).toBeVisible();
    await expect(page.getByRole('button', { name: /下载定稿/ })).toBeEnabled();
    await expect(page).toHaveScreenshot('step5-confirmation-completed.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });
});
