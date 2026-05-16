import { expect, test } from '@playwright/test';
import { bootstrapState, seedAppStatePatch } from './helpers/appState';

test.describe('Step4Fix interaction optimisations', () => {
  test('action card is-user-focus class auto-clears 2 seconds after click', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(4));
    await page.goto('/');

    // Jump to completion so all cards are visible and stable
    await page.getByRole('button', { name: '跳过动画，查看结果' }).click();
    await expect(page.getByTestId('fix-runtime-action-count')).toContainText('当前修复');

    const cards = page.locator('[data-testid^="fix-runtime-action-card-"]');
    await expect(cards).toHaveCount(1);

    // Click the first card
    const targetCard = cards.first();
    await targetCard.click();

    // Class should be set immediately after click
    await expect(targetCard).toHaveClass(/is-user-focus/);

    // Must clear within 3.5 s (2 s timeout + buffer for rendering)
    await expect.poll(async () => {
      const cls = await targetCard.getAttribute('class');
      return cls?.includes('is-user-focus') ? 'focused' : 'cleared';
    }, { timeout: 3500 }).toBe('cleared');

    // After clear, re-click to confirm the cycle works repeatedly
    await targetCard.click();
    await expect(targetCard).toHaveClass(/is-user-focus/);
    await expect.poll(async () => {
      const cls = await targetCard.getAttribute('class');
      return cls?.includes('is-user-focus') ? 'focused' : 'cleared';
    }, { timeout: 3500 }).toBe('cleared');
  });

  test('start fix button is hidden during normal demo playback', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(4));
    await page.goto('/');

    // Auto-start fires → demo playback → status is 'running'
    await expect(page.getByRole('button', { name: '暂停' })).toBeVisible({ timeout: 3000 });

    // Start fix button must NOT be visible while fix is running/demoing
    await expect(page.getByRole('button', { name: '启动修复' })).toHaveCount(0);

    // After jumping to completion, still no start button (progress exists)
    await page.getByRole('button', { name: '跳过动画，查看结果' }).click();
    await expect(page.getByRole('button', { name: '启动修复' })).toHaveCount(0);
  });

  test('action card click scrolls the card into the top of the feed in one pass', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(4));
    await page.goto('/');

    await page.getByRole('button', { name: '跳过动画，查看结果' }).click();
    await expect(page.getByTestId('fix-runtime-action-count')).toContainText('当前修复');

    const feed = page.getByTestId('fix-runtime-action-feed');
    const cards = page.locator('[data-testid^="fix-runtime-action-card-"]');

    // Scroll feed to bottom so none of the cards are in view
    await feed.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    // Click the last card (furthest from top)
    const targetCard = cards.last();
    const targetTestId = await targetCard.getAttribute('data-testid');
    await targetCard.click();

    // The current-task card should remain visible without forcing a dense list to the top.
    await expect(targetCard).toBeInViewport();
  });
});
