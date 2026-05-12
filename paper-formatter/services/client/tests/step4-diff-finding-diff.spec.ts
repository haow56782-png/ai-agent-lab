import { expect, test } from '@playwright/test';
import type { FindingDiffItem } from '../src/api/client';
import { buildDiffItemsFromFindingDiffs, buildPaperPages, buildReviewItemsFromFindingDiffs } from '../src/screens/step4-diff/diffViewModel';

test.describe('Step4Diff formatter finding diff model', () => {
  test('uses formatter FindingDiffItem finding_id as the Step5 review and canvas identity', () => {
    const findingId = '11111111-1111-4111-8111-111111111111';
    const formatterDiff: FindingDiffItem = {
      finding_id: findingId,
      related_finding_ids: [findingId],
      page: 2,
      type: 'content_change',
      action: 'replace',
      element: '参考文献',
      before: '参考文献缺少 DOI 信息',
      after: '补齐 DOI 并按国标著录',
      position: '参考文献',
      note: '缺 DOI',
      rule_id: 'RULE-L2-REFERENCE_DOI',
      rule_group: '参考文献',
    };

    const reviewItems = buildReviewItemsFromFindingDiffs([formatterDiff], ['摘要', '参考文献缺少 DOI 信息']);
    const diffItems = buildDiffItemsFromFindingDiffs([formatterDiff]);
    const paperPages = buildPaperPages([1, 2], ['摘要', '参考文献缺少 DOI 信息'], reviewItems, diffItems);

    expect(reviewItems[0].findingId).toBe(findingId);
    expect(reviewItems[0].id).toBe(findingId);
    expect(diffItems[2][0].findingId).toBe(findingId);
    expect(paperPages[1].reviewAnchors[0].findingId).toBe(findingId);
    expect(paperPages[1].reviewAnchors[0].diff?.beforeText).toBe('参考文献缺少 DOI 信息');
  });
});
