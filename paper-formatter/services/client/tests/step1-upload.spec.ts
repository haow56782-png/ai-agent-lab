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
  test('does not render an empty history panel when there is no prior upload history', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('upload-history-panel')).toHaveCount(0);
    await expect(page.getByTestId('paper-upload-zone')).toBeVisible();
  });

  test('opens the file picker exactly once from each upload trigger', async ({ page }) => {
    await installFileInputClickCounter(page);
    await page.goto('/');

    await page.getByRole('button', { name: '上传 Word 论文' }).click();
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

  test('switches upload copy and file input accept between Word repair and PDF detection', async ({ page }) => {
    await page.goto('/');

    const fileInput = page.locator('input[type="file"]');
    await expect(page.getByText('拖入 Word 论文，或点击选择文件')).toBeVisible();
    await expect(page.getByRole('button', { name: '上传 Word 论文' })).toBeVisible();
    await expect(fileInput).toHaveAttribute('accept', '.docx');

    await page.getByRole('tab', { name: /PDF 格式检测/ }).click();

    await expect(page.getByText('拖入 PDF 论文，或点击选择文件')).toBeVisible();
    await expect(page.getByRole('button', { name: '上传 PDF 检测' })).toBeVisible();
    await expect(fileInput).toHaveAttribute('accept', '.pdf');
  });

  test('shows explicit mismatch errors for the selected upload mode', async ({ page }) => {
    await page.goto('/');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'paper.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    });
    await expect(page.getByText('当前选择的是 Word 排版修复，请上传 .docx 文件')).toBeVisible();

    await page.getByRole('tab', { name: /PDF 格式检测/ }).click();
    await fileInput.setInputFiles({
      name: 'paper.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from('docx'),
    });
    await expect(page.getByText('当前选择的是 PDF 格式检测，请上传 .pdf 文件')).toBeVisible();
  });
});
