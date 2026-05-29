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
    const findingMeta = page.getByTestId('fix-runtime-topbar-finding');
    const remainingMeta = page.getByTestId('fix-runtime-topbar-remaining');
    const actionCount = page.getByTestId('fix-runtime-action-count');
    const livePage = page.getByTestId('fix-runtime-live-page');

    await expect(pageMeta).toContainText('第 3 页');
    await expect(findingMeta).toContainText('正在修复 0/3');
    await expect(actionCount).toContainText('当前发现项');
    await expect(livePage).toHaveAttribute('data-page-number', '3');

    await expect(remainingMeta).not.toContainText('剩余 0s');

    await expect(livePage).toHaveAttribute('data-page-number', '3');
    await expect(pageMeta).toContainText('第 3 页');
  });

  test('Step4Fix replays completed server artifacts instead of jumping straight to completion', async ({ page }) => {
    const state = seedAppStatePatch(4);
    state.documentIdentity = {
      legacyDocId: 'doc_real_replay',
      canonicalDocumentId: '11111111-1111-4111-8111-111111111111',
    };
    state.schoolId = 'thu';
    state.fixJobId = null;
    state.jobStatus = 'queued';

    await page.route('**/api/v1/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', freeFixLimit: 15 }),
      });
    });
    await page.route('**/api/v1/jobs/fix', async (route) => {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ jobId: 'job_replay_done', status: 'queued', estimatedSeconds: 180, freeFixLimit: 15 }),
      });
    });
    await page.route('**/api/v1/jobs/job_replay_done/fix-status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'done',
          completedSteps: [
            { type: 'heading', status: 'done', summary: '标题层级已写回', duration: 1 },
            { type: 'body_style', status: 'done', summary: '正文样式已写回', duration: 1 },
            { type: 'reference_format', status: 'done', summary: '参考文献已写回', duration: 1 },
          ],
          progress: 100,
          stage: 'done',
          message: '修复稿已生成，可进入人工确认',
          artifacts: [
            { id: 'art_heading', fixType: 'heading', title: '标题层级', summary: '已写回标题层级', details: [], status: 'ready', finding_id: canonicalFindingIds.first },
            { id: 'art_body', fixType: 'body_style', title: '正文样式', summary: '已写回正文样式', details: [], status: 'ready', finding_id: canonicalFindingIds.second },
            { id: 'art_reference', fixType: 'reference_format', title: '参考文献', summary: '已写回参考文献', details: [], status: 'ready', finding_id: canonicalFindingIds.third },
          ],
          findingTotal: 3,
          autoFixableFindingTotal: 3,
          fixedFindingTotal: 3,
          needsReviewFindingTotal: 0,
          notAutoFixedFindingTotal: 0,
          actionTotal: 3,
          completedActionTotal: 3,
          result: {
            fixedFileId: 'outputs/doc_real_replay/fixed.docx',
            totalFixed: 3,
            totalFindings: 3,
            newScore: 96,
            contentHash: 'content-hash',
            originalHash: 'original-hash',
          },
        }),
      });
    });

    await bootstrapState(page, state);
    await page.goto('/');

    await expect(page.getByTestId('fix-runtime-action-count')).toContainText('当前发现项');
    await expect(page.getByTestId('fix-runtime-topbar-finding')).toContainText('正在修复 0/3');
    await expect(page.getByTestId('fix-runtime-topbar-remaining')).not.toContainText('已完成');
    await expect(page.getByRole('button', { name: /写回中 · 0\/3/ })).toBeDisabled();
    await expect(page.getByTestId('fix-runtime-paper-scanner')).toHaveCount(0);
    await expect(page.getByRole('progressbar', { name: '修复步骤进度' })).toHaveAttribute('aria-valuenow', '0');
    await expect(page.getByRole('progressbar', { name: '修复步骤进度' })).toHaveAttribute('aria-valuemax', '3');
    await expect(page.getByTestId('fix-runtime-current-task-card')).toBeVisible();
  });

  test('Step4Fix completed view matches the fixed review-modification layout', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(4));
    await page.goto('/');

    await page.getByRole('button', { name: '跳过动画，查看结果' }).click();

    await expect(page.getByTestId('fix-runtime-topbar-finding')).toContainText('修复完成 · 共 3 项');
    await expect(page.getByTestId('fix-runtime-topbar-finding')).toContainText('已写回');
    await expect(page.getByTestId('fix-runtime-complete-card')).toContainText('修复进度');
    await expect(page.getByTestId('fix-runtime-complete-card')).toContainText('3 / 3');
    await expect(page.getByTestId('fix-runtime-complete-card')).toContainText('待确认');
    await expect(page.getByRole('button', { name: /进入校对台/ })).toBeVisible();
    await expect(page.getByText('修复记录')).toBeVisible();
    await expect(page.getByTestId('fix-runtime-stream-report')).toContainText('已完成 3 项格式写回');
    await page.getByTestId('fix-runtime-stream-report').getByRole('button', { name: /查看完整修复过程 · 3 项/ }).click();
    await expect(page.getByTestId('fix-process-drawer')).toContainText('完整修复过程');
    await page.getByTestId('fix-runtime-stream-report').getByRole('button', { name: '安全说明' }).click();
    await expect(page.getByLabel('安全修复模式')).toHaveClass(/is-highlighted/);
    await expect(page.getByText('安全修复模式已开启')).toBeVisible();
    await expect(page.getByRole('button', { name: /写回中/ })).toHaveCount(0);
  });

  test('Step4Fix completed zero-finding browse mode still shows the streaming report', async ({ page }) => {
    const state = seedAppStatePatch(4);
    state.parseResults = {
      ...state.parseResults!,
      findings: [],
      ruleDetails: [],
      rules: { passed: 14, warnings: 0, failed: 0 },
    };

    await bootstrapState(page, state);
    await page.goto('/');

    await page.getByRole('button', { name: '跳过动画，查看结果' }).click();

    await expect(page.getByTestId('fix-runtime-complete-card')).toContainText('修复进度');
    await expect(page.getByTestId('fix-runtime-stream-report')).toContainText('未发现需要写回的格式项');
    await expect(page.getByTestId('fix-runtime-stream-report')).toContainText('查看完整修复过程 · 0 项');
    await expect(page.getByRole('button', { name: /写回中/ })).toHaveCount(0);
  });

  test('Step4Fix keeps visual progress sequential when server reports batched writebacks', async ({ page }) => {
    const state = seedAppStatePatch(4);
    state.documentIdentity = {
      legacyDocId: 'doc_running_batch',
      canonicalDocumentId: '11111111-1111-4111-8111-111111111111',
    };
    state.schoolId = 'thu';
    state.fixJobId = 'job_running_batch';
    state.jobStatus = 'running';

    await page.route('**/api/v1/jobs/job_running_batch/fix-status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'running',
          completedSteps: [
            { type: 'heading', status: 'done', summary: '标题层级已写回', duration: 1 },
            { type: 'body_style', status: 'done', summary: '正文样式已写回', duration: 1 },
            { type: 'reference_format', status: 'done', summary: '参考文献已写回', duration: 1 },
          ],
          currentStep: 'reference_format',
          progress: 80,
          stage: 'writing',
          message: '服务端已批量写回，前端仍逐项展示',
          artifacts: [
            { id: 'art_heading', fixType: 'heading', title: '标题层级', summary: '已写回标题层级', details: [], status: 'ready', finding_id: canonicalFindingIds.first },
            { id: 'art_body', fixType: 'body_style', title: '正文样式', summary: '已写回正文样式', details: [], status: 'ready', finding_id: canonicalFindingIds.second },
            { id: 'art_reference', fixType: 'reference_format', title: '参考文献', summary: '已写回参考文献', details: [], status: 'ready', finding_id: canonicalFindingIds.third },
          ],
          findingTotal: 3,
          autoFixableFindingTotal: 3,
          fixedFindingTotal: 3,
          needsReviewFindingTotal: 0,
          notAutoFixedFindingTotal: 0,
        }),
      });
    });

    await bootstrapState(page, state);
    await page.goto('/');

    const stepProgress = page.getByRole('progressbar', { name: '修复步骤进度' });
    await expect(stepProgress).toHaveAttribute('aria-valuemax', '3');
    await expect(stepProgress).toHaveAttribute('aria-valuenow', '0');
    await expect(page.getByTestId('fix-runtime-topbar-finding')).toContainText('正在修复 0/3');
    await expect(page.getByRole('button', { name: /写回中 · 0\/3/ })).toBeDisabled();
  });

  test('Step4Fix right action card click reframes the card upward and syncs the paper page', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(4));
    await page.goto('/');

    await page.getByRole('button', { name: '跳过动画，查看结果' }).click();
    await expect(page.getByTestId('fix-runtime-action-count')).toContainText('完整修复过程');

    const feed = page.getByTestId('fix-runtime-action-feed');
    const cards = page.locator('[data-testid^="fix-runtime-action-card-"]');
    await expect(cards.first()).toBeVisible();

    await feed.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    const targetCardBeforeClick = cards.last();
    const targetTestId = await targetCardBeforeClick.getAttribute('data-testid');
    if (!targetTestId) throw new Error('Expected the target action card to expose a stable test id.');

    const targetCard = page.getByTestId(targetTestId);
    const targetPage = await targetCard.getAttribute('data-page-number');
    const targetFindingId = await targetCard.getAttribute('data-finding-id');
    await targetCard.click();

    expect(targetFindingId).toMatch(canonicalFindingIdPattern);
    await expect(page.getByTestId('fix-runtime-topbar-finding')).toContainText('当前正在修复');
    await expect(page.getByTestId('fix-runtime-live-page')).toHaveAttribute('data-page-number', targetPage || '1');
    await expect(targetCard).toHaveClass(/is-user-focus/);
    await expect(targetCard).toBeInViewport();
  });

  test('Step4Fix paper keeps only the focused reading window instead of stacking the full history', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(4));
    await page.goto('/');

    await page.getByRole('button', { name: '跳过动画，查看结果' }).click();
    const targetCard = page.locator('[data-testid^="fix-runtime-action-card-"]').first();
    await targetCard.click();

    const livePage = page.getByTestId('fix-runtime-live-page');
    await expect.poll(async () => await livePage.locator('.fix-paper-annotation').count()).toBeLessThanOrEqual(5);
    await expect.poll(async () => await livePage.locator('.fix-paper-replace-note').count()).toBeLessThanOrEqual(5);
  });

  test('Step4Fix groups repeated action logs into one card per finding', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(4));
    await page.goto('/');

    await page.getByRole('button', { name: '跳过动画，查看结果' }).click();
    const cards = page.locator('[data-testid^="fix-runtime-action-card-"]');
    await expect(cards).toHaveCount(3);
    await expect(cards.first()).toContainText(/已完成|正在修复|等待处理/);
    await expect(page.getByTestId('fix-process-drawer')).toBeVisible();
    await expect(page.locator('.fix-process-row')).toHaveCount(3);
  });

  test('Step4Diff renders non-empty paper content for review-linked pages', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    await expect(page.getByTestId('diff-review-panel')).toBeVisible();
    await expect(page.getByTestId('diff-paper-stream')).toBeVisible();
    await expect(page.getByTestId('diff-paper-page-3')).toContainText('本文围绕论文排版中的标题层级');
  });

  test('Step5 discipline banner lets users switch ambiguous STEM inference to humanities view', async ({ page }) => {
    const state = seedAppStatePatch(5);
    state.parseResults = JSON.parse(JSON.stringify(state.parseResults));
    state.parseResults.disciplineHint = {
      discipline: 'stem',
      confidence: 0.62,
      needsBanner: true,
      topSignals: [{ label: '公式对象密度', detail: '2 个公式 / 6 段' }],
    };
    state.parseResults.findings = [
      {
        ...state.parseResults.findings[0],
        finding_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        rule_id: 'FORMULA_NUMBERING',
        ruleSource: 'discipline',
        ruleLevel: 'discipline',
        rule_group: '公式',
        rule_snapshot: {
          ...state.parseResults.findings[0].rule_snapshot,
          rule_text: '公式连续编号',
          rule_description: '独立公式按章节连续编号。',
        },
        evidence_spans: [{ page: 3, char_start: 0, char_end: 8, snippet: '公式编号 (3-3)' }],
        evidence_snapshot: '公式编号 (3-3)',
        suggestion: {
          ...state.parseResults.findings[0].suggestion,
          fix_diff: {
            before: '公式编号 (3-3)',
            after: '公式编号 (3-2)',
            spans_affected: [{ page: 3, char_start: 0, char_end: 8, snippet: '公式编号 (3-3)' }],
          },
          explanation: '公式编号需要连续。',
        },
      },
      {
        ...state.parseResults.findings[1],
        finding_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        rule_id: 'FIGURE_CAPTION_STYLE',
        ruleSource: 'school',
        ruleLevel: 'school',
        rule_group: '图表',
        rule_snapshot: {
          ...state.parseResults.findings[1].rule_snapshot,
          rule_text: '图表题注格式',
          rule_description: '图表题注按学校模板统一。',
        },
        evidence_spans: [{ page: 5, char_start: 0, char_end: 8, snippet: '图表题注格式' }],
        evidence_snapshot: '图表题注格式',
        suggestion: {
          ...state.parseResults.findings[1].suggestion,
          fix_diff: {
            before: '图表题注格式',
            after: '图表题注格式按学校模板统一',
            spans_affected: [{ page: 5, char_start: 0, char_end: 8, snippet: '图表题注格式' }],
          },
          explanation: '图表题注按学校模板统一。',
        },
      },
      state.parseResults.findings[2],
    ];
    state.parseResults.ruleDetails = [
      {
        cat: '公式',
        items: [{ ruleId: 'FORMULA_NUMBERING', ruleSource: 'discipline', ruleLevel: 'discipline', label: '公式连续编号', status: 'warn', location: { pageIndex: 2 } }],
      },
      {
        cat: '图表',
        items: [{ ruleId: 'FIGURE_CAPTION_STYLE', ruleSource: 'school', ruleLevel: 'school', label: '图表题注格式', status: 'warn', location: { pageIndex: 4 } }],
      },
      ...state.parseResults.ruleDetails,
    ];

    await bootstrapState(page, state);
    await page.goto('/');

    await expect(page.getByTestId('discipline-confirm-banner')).toBeVisible();
    await expect(page.getByText('已按理工科规则校验')).toBeVisible();
    await expect(page.getByText('公式对象密度: 2 个公式 / 6 段')).toBeVisible();
    await expect(page.getByText('公式编号 (3-3)').first()).toBeVisible();
    await expect(page.getByText('图表题注格式').first()).toBeVisible();

    await page.getByRole('button', { name: '改为文科' }).click();

    await expect(page.getByTestId('discipline-confirm-banner')).toHaveCount(0);
    await expect(page.getByText('公式编号 (3-3)')).toHaveCount(0);
    await expect(page.getByText('图表题注格式').first()).toBeVisible();
    await expect(page.getByText('参考文献缺少 DOI 信息').first()).toBeVisible();
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

  test('Step4Diff rule card click focuses the matching review card instead of jumping to the first item', async ({ page }) => {
    await bootstrapState(page, seedAppStatePatch(5));
    await page.goto('/');

    await page.getByRole('button', { name: '文档对比' }).click();
    await page.getByRole('button', { name: /缺 DOI/ }).click();

    await expect(reviewCard(page, canonicalFindingIds.third)).toHaveClass(/is-focus/);
    await expect(page.getByTestId('diff-review-panel').getByRole('progressbar', { name: '确认进度' })).toHaveAttribute('aria-valuenow', '3');
    expect(await hashFindingId(page)).toBe(canonicalFindingIds.third);
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

  test('Step6 download gate unlocks after the format job itself reaches completed', async ({ page }) => {
    let jobPollCount = 0;
    await page.route('**/api/v1/jobs/job_format_ready', async (route) => {
      jobPollCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobId: 'job_format_ready',
          type: 'format',
          status: jobPollCount > 1 ? 'completed' : 'queued',
          progress: jobPollCount > 1 ? 100 : 60,
          stage: jobPollCount > 1 ? 'done' : 'formatting',
          docId: 'demo-doc',
          profileId: 'sch_demo',
          estimatedSeconds: 5,
          result: {},
        }),
      });
    });

    const state = seedAppStatePatch(6);
    state.exported = true;
    state.formatJobId = 'job_format_ready';
    state.jobStatus = 'queued';
    await bootstrapState(page, state);
    await page.goto('/');

    await expect.poll(() => jobPollCount).toBeGreaterThan(0);
    await expect.poll(async () => await page.getByRole('button', { name: /领取最终交稿稿件/ }).isEnabled()).toBe(true);
    await expect(page.getByText('交付文件还在生成中，完成后才能下载真实 DOCX。')).toHaveCount(0);
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

    await page.keyboard.press('PageDown');
    await expect(thirdCard).toHaveClass(/is-focus/);
    await expect(progress).toHaveAttribute('aria-valuenow', '3');

    await page.keyboard.press('PageUp');
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
