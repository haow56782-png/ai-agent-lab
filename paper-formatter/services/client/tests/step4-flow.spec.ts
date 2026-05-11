import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  bootstrapState,
  getStep5StoredState,
  seedAppStatePatch,
} from './helpers/appState';

const commandModifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const canonicalFindingIds = {
  first: '672fca73-37ac-4276-872f-ca73672fca73',
  second: '86255e9e-e9e5-4268-8625-5e9e86255e9e',
  third: '09e836f4-4f63-4e90-89e8-36f409e836f4',
} as const;
const canonicalFindingIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/;

async function pressCommandShortcut(page: Page, key: string) {
  if (commandModifier === 'Meta') {
    await page.evaluate((shortcutKey) => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: shortcutKey,
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }));
    }, key);
    return;
  }

  await page.keyboard.down(commandModifier);
  await page.keyboard.press(key);
  await page.keyboard.up(commandModifier);
}

function reviewCard(page: Page, findingId: string) {
  return page.getByTestId(`diff-review-card-${findingId}`);
}

async function findingIdFromCard(card: Locator) {
  const testId = await card.getAttribute('data-testid');
  if (!testId?.startsWith('diff-review-card-')) {
    throw new Error(`Expected canonical review card test id, got ${testId || 'null'}`);
  }
  return testId.slice('diff-review-card-'.length);
}

async function hashFindingId(page: Page) {
  return page.evaluate(() => {
    const hash = window.location.hash;
    return hash.startsWith('#finding=') ? decodeURIComponent(hash.slice('#finding='.length)) : null;
  });
}

test.describe('Step4 baseline behaviors', () => {
  test('TopBar keeps the centered stepper clear of long document names', async ({ page }) => {
    const state = seedAppStatePatch(5);
    state.doc = {
      ...state.doc!,
      name: '胡冬 20260508learned 胡冬 20260508 修改版长文件名.docx',
    };
    await bootstrapState(page, state);
    await page.goto('/');

    const stepperBox = await page.getByTestId('topbar-stepper').boundingBox();
    const docNameBox = await page.getByTestId('topbar-doc-name').boundingBox();
    expect(stepperBox).not.toBeNull();
    expect(docNameBox).not.toBeNull();

    expect(docNameBox!.x).toBeGreaterThanOrEqual(stepperBox!.x + stepperBox!.width + 8);
    await expect(page.getByTestId('topbar-doc-name')).toHaveCSS('text-overflow', 'ellipsis');
  });

  test('Step3 keeps confirmation behind repair and shows health findings before repair', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(3));
    await page.goto('/');

    await expect(page.getByText(/待处理发现项/)).toBeVisible();
    await expect(page.getByRole('button', { name: /查看 .* 项发现并处理/ }).first()).toBeVisible();
    await expect(page.getByText('查看差异详情')).toHaveCount(0);

    await page.getByRole('button', { name: /查看 .* 项发现并处理/ }).first().click();
    await expect(page.locator('section.fix-runtime-shell')).toBeVisible();
  });

  test('Step4Fix browse mode auto-starts demo playback without missing-context error', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(4));
    await page.goto('/');

    await expect(page.getByRole('button', { name: '暂停' })).toBeVisible();
    await expect(page.getByText('缺少文档或学校规则，无法启动修复')).toHaveCount(0);
    await expect(page.locator('section.fix-runtime-shell')).toBeVisible();
  });

  test('Step4Fix keeps page, remaining time, and action count in one visual timeline', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(4));
    await page.goto('/');

    const pageMeta = page.getByTestId('fix-runtime-topbar-page');
    const remainingMeta = page.getByTestId('fix-runtime-topbar-remaining');
    const actionCount = page.getByTestId('fix-runtime-action-count');
    const livePage = page.getByTestId('fix-runtime-live-page');

    await expect(pageMeta).toContainText('第 1 页');
    await expect(actionCount).toContainText('修复动作 0/42');
    await expect(livePage).toHaveAttribute('data-page-number', '1');

    const initialRemaining = await remainingMeta.textContent();

    await expect.poll(async () => await actionCount.textContent(), { timeout: 5000 }).not.toBe('修复动作 0/42');
    await expect.poll(async () => await remainingMeta.textContent(), { timeout: 5000 }).not.toBe(initialRemaining);

    await expect(livePage).toHaveAttribute('data-page-number', '1');
    await expect(pageMeta).toContainText('第 1 页');
  });

  test('Step4Fix right action card click reframes the card upward and syncs the paper page', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(4));
    await page.goto('/');

    await page.getByRole('button', { name: '跳到完成' }).click();
    await expect(page.getByTestId('fix-runtime-action-count')).toContainText('修复动作 42/42');

    const feed = page.getByTestId('fix-runtime-action-feed');
    const cards = page.locator('[data-testid^="fix-runtime-action-card-"]');
    await expect(cards).toHaveCount(20);

    await feed.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    const targetCardBeforeClick = cards.last();
    const targetTestId = await targetCardBeforeClick.getAttribute('data-testid');
    if (!targetTestId) throw new Error('Expected the target action card to expose a stable test id.');

    const targetCard = page.getByTestId(targetTestId);
    const targetPage = await targetCard.getAttribute('data-page-number');
    await targetCard.click();

    await expect(page.getByTestId('fix-runtime-live-page')).toHaveAttribute('data-page-number', targetPage || '1');
    await expect(targetCard).toHaveClass(/is-user-focus/);
    await expect.poll(async () => {
      return targetCard.evaluate((node) => {
        const feedNode = node.closest('[data-testid="fix-runtime-action-feed"]') as HTMLElement | null;
        if (!feedNode) return Number.POSITIVE_INFINITY;
        return Math.round(node.offsetTop - feedNode.scrollTop);
      });
    }).toBeLessThanOrEqual(100);
  });

  test('Step4Diff renders non-empty paper content for review-linked pages', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    await expect(page.getByTestId('diff-review-panel')).toBeVisible();
    await expect(page.getByTestId('diff-paper-stream')).toBeVisible();
    await expect(page.getByTestId('diff-paper-page-3')).toContainText('本文围绕论文排版中的标题层级');
  });

  test('Step4Diff review cards expose canonical finding_id and write hash focus from card clicks', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    const cards = page.locator('[data-testid^="diff-review-card-"]');
    await expect(cards).toHaveCount(3);

    const firstFindingId = await findingIdFromCard(cards.nth(0));
    const secondFindingId = await findingIdFromCard(cards.nth(1));
    expect(firstFindingId).toBe(canonicalFindingIds.first);
    expect(secondFindingId).toBe(canonicalFindingIds.second);
    expect(canonicalFindingIdPattern.test(firstFindingId)).toBe(true);
    expect(canonicalFindingIdPattern.test(secondFindingId)).toBe(true);

    const secondCard = reviewCard(page, secondFindingId);
    await secondCard.click();

    await expect(secondCard).toHaveClass(/is-focus/);
    await expect(page.getByRole('progressbar', { name: '确认进度' })).toHaveAttribute('aria-valuenow', '2');
    expect(await hashFindingId(page)).toBe(secondFindingId);
    await expect(page.locator(`[data-finding-id="${secondFindingId}"]`)).toHaveCount(1);
  });

  test('Step4Diff canvas anchors and review cards subscribe to the same finding_id focus', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    const thirdFindingId = await findingIdFromCard(page.locator('[data-testid^="diff-review-card-"]').nth(2));
    expect(thirdFindingId).toBe(canonicalFindingIds.third);

    const thirdAnchor = page.locator(`[data-finding-id="${thirdFindingId}"]`);
    await expect(thirdAnchor).toHaveCount(1);
    await thirdAnchor.scrollIntoViewIfNeeded();
    await page.getByTestId('diff-paper-stream').hover();
    await page.mouse.wheel(0, 240);

    await expect(reviewCard(page, thirdFindingId)).toHaveClass(/is-focus/, { timeout: 3000 });
    expect(await hashFindingId(page)).toBe(thirdFindingId);
    await expect(page.getByRole('progressbar', { name: '确认进度' })).toHaveAttribute('aria-valuenow', '3');
  });

  test('Step4Diff restores focus from URL hash using canonical finding_id', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto(`/#finding=${encodeURIComponent(canonicalFindingIds.third)}`);

    const thirdCard = reviewCard(page, canonicalFindingIds.third);
    await expect(thirdCard).toHaveClass(/is-focus/);
    await expect(page.getByRole('progressbar', { name: '确认进度' })).toHaveAttribute('aria-valuenow', '3');
    await expect(page.getByTestId('diff-paper-page-7')).toBeVisible();
    expect(await hashFindingId(page)).toBe(canonicalFindingIds.third);
  });

  test('accepting one review item decrements pending confirmation count', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    const footerStatus = page.getByTestId('diff-footer-status');
    await expect(footerStatus).toContainText(/已处置 0\/3 项 · P0 剩 0 \/ P1 剩 1 \/ P2 剩 2/);

    await page.getByRole('button', { name: '接受' }).first().click();

    await expect(footerStatus).toContainText(/已处置 1\/3 项 · P0 剩 0 \/ P1 剩 0 \/ P2 剩 2/);
    await expect(page.getByTestId('diff-banner-count')).toContainText('2');
  });

  test('Step5 confirmation stays before download until final export confirmation', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    const footerStatus = page.getByTestId('diff-footer-status');
    await expect(page.getByText('你的正文没有被改动。')).toBeVisible();
    await expect(footerStatus).toContainText(/已处置 0\/3 项 · P0 剩 0 \/ P1 剩 1 \/ P2 剩 2/);

    await page.getByRole('button', { name: /全部接受这 3 处/ }).click();
    await expect(page.getByText('确定全部接受这 3 处?')).toBeVisible();
    await expect(page.getByText('你仍会停留在确认页')).toBeVisible();

    await page.getByRole('button', { name: '确定全部接受' }).click();
    await expect(page.getByText('全部确认完成。')).toBeVisible();
    await expect(page.getByText('可以下载定稿了。')).toBeVisible();
    await expect(page.getByText('这里是下载与留档，不再处理确认动作')).toHaveCount(0);

    await page.getByRole('button', { name: /下载定稿/ }).click();
    await expect(page.getByText('交稿前最后确认')).toBeVisible();
    await expect(page.getByText('人工确认：3 项已经由你亲自过目')).toBeVisible();

    await page.getByRole('button', { name: '确认并生成交稿稿件' }).click();
    await expect(page.getByText('这里是下载与留档，不再处理确认动作')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('确认页已过目，再下载最终交稿版')).toBeVisible();
  });

  test('Step5 download gate follows blocking finding severity instead of total pending count', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    await page.getByRole('button', { name: '接受' }).first().click();
    await expect(page.getByTestId('diff-footer-status')).toContainText(/P1 剩 0 \/ P2 剩 2/);

    await page.getByRole('button', { name: /下载定稿/ }).click();
    await expect(page.getByText('交稿前最后确认')).toBeVisible();
    await expect(page.getByText('人工确认：1 项已经由你亲自过目')).toBeVisible();
  });

  test('Step5 allows signed P1 exemption but records the explicit risk path before download', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    await page.getByRole('button', { name: /下载定稿/ }).click();
    await expect(page.getByText(/仍有 1 项 P1 发现未处理/)).toBeVisible();

    await page.getByPlaceholder('请写明为什么允许这些 P1 发现暂不处理，至少 20 个字').fill('作者确认这一项不会影响学校交稿要求，先行下载定稿并承担风险。');
    await page.getByLabel('我承担未处理 P1 发现带来的交稿风险，并同意写入审计记录。').check();
    await page.getByRole('button', { name: '签字豁免并继续下载' }).click();

    await expect(page.getByText('交稿前最后确认')).toBeVisible();
    await expect(page.getByText('人工确认：0 项已经由你亲自过目')).toBeVisible();
  });

  test('Step5 accepting one item auto-focuses the next pending review', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    const firstCard = page.getByTestId('diff-review-card-672fca73-37ac-4276-872f-ca73672fca73');
    const secondCard = page.getByTestId('diff-review-card-86255e9e-e9e5-4268-8625-5e9e86255e9e');
    const progress = page.getByRole('progressbar', { name: '确认进度' });

    await expect(firstCard).toHaveClass(/is-focus/);
    await firstCard.getByRole('button', { name: '接受' }).click();

    await expect(firstCard).toHaveClass(/is-accepted/);
    await expect(secondCard).toHaveClass(/is-focus/, { timeout: 1500 });
    await expect(progress).toHaveAttribute('aria-valuenow', '2');
    await expect(page.getByTestId('diff-footer-status')).toContainText(/已处置 1\/3 项 · P0 剩 0 \/ P1 剩 0 \/ P2 剩 2/);
  });

  test('Step5 rejecting one item preserves the rejection mark and auto-focuses the next pending review', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    const firstCard = page.getByTestId('diff-review-card-672fca73-37ac-4276-872f-ca73672fca73');
    const secondCard = page.getByTestId('diff-review-card-86255e9e-e9e5-4268-8625-5e9e86255e9e');
    const progress = page.getByRole('progressbar', { name: '确认进度' });

    await expect(firstCard).toHaveClass(/is-focus/);
    await firstCard.getByRole('button', { name: '拒绝' }).click();

    await expect(firstCard).toHaveClass(/is-rejected/);
    await expect(secondCard).toHaveClass(/is-focus/, { timeout: 1500 });
    await expect(progress).toHaveAttribute('aria-valuenow', '2');
    await expect(page.getByTestId('diff-footer-status')).toContainText(/已处置 1\/3 项 · P0 剩 0 \/ P1 剩 0 \/ P2 剩 2/);
  });

  test('Step5 self-edit focuses the selected review and scrolls the paper to its page', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    const thirdCard = page.getByTestId('diff-review-card-09e836f4-4f63-4e90-89e8-36f409e836f4');
    const progress = page.getByRole('progressbar', { name: '确认进度' });

    await thirdCard.getByRole('button', { name: /我自己改/ }).click();

    await expect(thirdCard).toHaveClass(/is-focus/);
    await expect(progress).toHaveAttribute('aria-valuenow', '3');
    await expect(page.getByTestId('diff-paper-page-7')).toBeVisible();
  });

  test('Step5 keyboard arrows, Enter, and Esc move through review items accessibly', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    const firstCard = page.getByTestId('diff-review-card-672fca73-37ac-4276-872f-ca73672fca73');
    const secondCard = page.getByTestId('diff-review-card-86255e9e-e9e5-4268-8625-5e9e86255e9e');
    const thirdCard = page.getByTestId('diff-review-card-09e836f4-4f63-4e90-89e8-36f409e836f4');
    const progress = page.getByRole('progressbar', { name: '确认进度' });
    const footerStatus = page.getByTestId('diff-footer-status');

    await expect(firstCard).toHaveClass(/is-focus/);
    await expect(progress).toHaveAttribute('aria-valuenow', '1');

    await page.keyboard.press('ArrowDown');
    await expect(secondCard).toHaveClass(/is-focus/);
    await expect(progress).toHaveAttribute('aria-valuenow', '2');

    await page.keyboard.press('ArrowUp');
    await expect(firstCard).toHaveClass(/is-focus/);
    await expect(progress).toHaveAttribute('aria-valuenow', '1');

    await page.keyboard.press('Enter');
    await expect(firstCard).toHaveClass(/is-accepted/);
    await expect(secondCard).toHaveClass(/is-focus/, { timeout: 1500 });
    await expect(footerStatus).toContainText(/已处置 1\/3 项 · P0 剩 0 \/ P1 剩 0 \/ P2 剩 2/);

    await page.keyboard.press('Escape');
    await expect(secondCard).toHaveClass(/is-rejected/);
    await expect(thirdCard).toHaveClass(/is-focus/, { timeout: 1500 });
    await expect(progress).toHaveAttribute('aria-valuenow', '3');
    await expect(footerStatus).toContainText(/已处置 2\/3 项 · P0 剩 0 \/ P1 剩 0 \/ P2 剩 1/);
  });

  test('Step5 keyboard shortcuts accept all and open download confirmation only after completion', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    await pressCommandShortcut(page, 'Enter');
    await expect(page.getByText('确定全部接受这 3 处?')).toBeVisible();

    await page.getByRole('button', { name: '确定全部接受' }).click();
    await expect(page.getByText('全部确认完成。')).toBeVisible();
    await expect(page.getByText('可以下载定稿了。')).toBeVisible();
    await expect(page.getByText('交稿前最后确认')).toHaveCount(0);

    await pressCommandShortcut(page, 's');
    await expect(page.getByText('交稿前最后确认')).toBeVisible();
    await expect(page.getByText('人工确认：3 项已经由你亲自过目')).toBeVisible();
  });

  test('Step5 restores partial accepted and rejected state, focused review, and paper page after reload', async ({ page }) => {
    page.on('dialog', (dialog) => void dialog.accept());
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    const firstCard = page.getByTestId('diff-review-card-672fca73-37ac-4276-872f-ca73672fca73');
    const secondCard = page.getByTestId('diff-review-card-86255e9e-e9e5-4268-8625-5e9e86255e9e');
    const thirdCard = page.getByTestId('diff-review-card-09e836f4-4f63-4e90-89e8-36f409e836f4');
    const progress = page.getByRole('progressbar', { name: '确认进度' });
    const footerStatus = page.getByTestId('diff-footer-status');

    await firstCard.getByRole('button', { name: '接受' }).click();
    await expect(secondCard).toHaveClass(/is-focus/, { timeout: 1500 });
    await secondCard.getByRole('button', { name: '拒绝' }).click();
    await expect(thirdCard).toHaveClass(/is-focus/, { timeout: 1500 });
    await thirdCard.getByRole('button', { name: /我自己改/ }).click();
    await expect(page.getByTestId('diff-paper-page-7')).toBeVisible();

    await expect.poll(async () => {
      const storedState = await getStep5StoredState(page);
      return storedState?.activeRuleId;
    }).toBe(canonicalFindingIds.third);

    await page.reload({ waitUntil: 'networkidle' });

    await expect(firstCard).toHaveClass(/is-accepted/);
    await expect(secondCard).toHaveClass(/is-rejected/);
    await expect(thirdCard).toHaveClass(/is-focus/);
    await expect(progress).toHaveAttribute('aria-valuenow', '3');
    await expect(footerStatus).toContainText(/已处置 2\/3 项 · P0 剩 0 \/ P1 剩 0 \/ P2 剩 1/);
    await expect(page.getByTestId('diff-paper-page-7')).toBeVisible();
  });

  test('Step5 protects partial confirmation before unload and releases the guard after completion', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    const footerStatus = page.getByTestId('diff-footer-status');
    await page.getByRole('button', { name: '接受' }).first().click();
    await expect(footerStatus).toContainText(/已处置 1\/3 项 · P0 剩 0 \/ P1 剩 0 \/ P2 剩 2/);

    const guardedDialogPromise = page.waitForEvent('dialog');
    const guardedReloadPromise = page.reload({ waitUntil: 'networkidle' });
    const guardedDialog = await guardedDialogPromise;
    expect(guardedDialog.type()).toBe('beforeunload');
    await guardedDialog.accept();
    await guardedReloadPromise;

    await expect(page.getByTestId('diff-footer-status')).toContainText(/已处置 1\/3 项 · P0 剩 0 \/ P1 剩 0 \/ P2 剩 2/);
    await page.getByRole('button', { name: /全部接受这 2 处/ }).click();
    await expect(page.getByText('确定全部接受这 2 处?')).toBeVisible();
    await page.getByRole('button', { name: '确定全部接受' }).click();
    await expect(page.getByText('全部确认完成。')).toBeVisible();

    let unexpectedDialog = false;
    page.once('dialog', async (dialog) => {
      unexpectedDialog = true;
      await dialog.dismiss();
    });
    await page.reload({ waitUntil: 'networkidle' });
    expect(unexpectedDialog).toBe(false);
    await expect(page.getByText('全部确认完成。')).toBeVisible();
  });
});
