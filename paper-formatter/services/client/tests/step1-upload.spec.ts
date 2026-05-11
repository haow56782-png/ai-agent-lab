import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __paperFileInputClickCount?: number;
  }
}

async function installFileInputClickCounter(page: Page) {
  await page.addInitScript(() => {
    window.__paperFileInputClickCount = 0;
    const nativeClick = HTMLInputElement.prototype.click;

    HTMLInputElement.prototype.click = function click() {
      if (this.type === 'file') {
        window.__paperFileInputClickCount = (window.__paperFileInputClickCount || 0) + 1;
        return;
      }
      return nativeClick.call(this);
    };
  });
}

async function getFileInputClickCount(page: Page) {
  return page.evaluate(() => window.__paperFileInputClickCount || 0);
}

async function resetFileInputClickCount(page: Page) {
  await page.evaluate(() => {
    window.__paperFileInputClickCount = 0;
  });
}

test.describe('Step1 upload entry', () => {
  test('opens the file picker exactly once from each upload trigger', async ({ page }) => {
    await installFileInputClickCounter(page);
    await page.goto('/');

    await page.getByRole('button', { name: '上传论文' }).click();
    await expect.poll(() => getFileInputClickCount(page)).toBe(1);

    await resetFileInputClickCount(page);
    await page.getByTestId('paper-upload-zone').click({ position: { x: 24, y: 24 } });
    await expect.poll(() => getFileInputClickCount(page)).toBe(1);

    await resetFileInputClickCount(page);
    await page.getByTestId('paper-upload-zone').focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => getFileInputClickCount(page)).toBe(1);
  });

  test('does not open the file picker when clicking secondary controls inside the upload zone', async ({ page }) => {
    await installFileInputClickCounter(page);
    await page.goto('/');

    await page.getByRole('button', { name: '看看有没有你的学校 →' }).click();

    await expect(page.getByText('已收录学校规范')).toBeVisible();
    await expect.poll(() => getFileInputClickCount(page)).toBe(0);
  });
});
