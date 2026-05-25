import assert from 'node:assert/strict';
import { getDiffConfirmationProgress } from '../../src/components/diffStatusProgress.ts';
import {
  isInlineDiffAction,
  isMarginDiffAction,
  shouldShowDiffMark,
  shouldShowFindingMark,
} from '../../src/screens/step4-diff/reviewVisualState.ts';

function testFindingMarksOnlyStayLoudWhileActionable() {
  assert.equal(shouldShowFindingMark('pending'), true);
  assert.equal(shouldShowFindingMark('needs_manual_review'), true);
  assert.equal(shouldShowFindingMark('accepted'), false);
  assert.equal(shouldShowFindingMark('rejected'), false);
  assert.equal(shouldShowFindingMark('self_edited'), false);
  assert.equal(shouldShowFindingMark('resolved'), false);
  assert.equal(shouldShowFindingMark('closed'), false);
  assert.equal(shouldShowFindingMark('superseded'), false);
}

function testDiffMarksDoNotRepeatAfterDecision() {
  assert.equal(shouldShowDiffMark(undefined), true);
  assert.equal(shouldShowDiffMark('accepted'), false);
  assert.equal(shouldShowDiffMark('ignored'), false);
}

function testConfirmationProgressIgnoresAutoPassTotal() {
  assert.deepEqual(
    getDiffConfirmationProgress({ total: 7, acceptedCount: 7, rejectedCount: 0 }),
    { confirmedCount: 7, ratio: 1, percent: 100 },
  );
  assert.deepEqual(
    getDiffConfirmationProgress({ total: 7, acceptedCount: 7, rejectedCount: 0 }),
    getDiffConfirmationProgress({ total: 7, acceptedCount: 9, rejectedCount: 0 }),
  );
  assert.equal(getDiffConfirmationProgress({ total: 7, acceptedCount: 0, rejectedCount: 0 }).percent, 0);
}

function testPaperMarksHaveSinglePrimaryLayer() {
  assert.equal(isInlineDiffAction('replace'), true);
  assert.equal(isInlineDiffAction('delete'), true);
  assert.equal(isInlineDiffAction('annotate'), false);
  assert.equal(isInlineDiffAction('format-hint'), false);
  assert.equal(isMarginDiffAction('annotate'), true);
  assert.equal(isMarginDiffAction('format-hint'), true);
  assert.equal(isMarginDiffAction('replace'), false);
  assert.equal(isMarginDiffAction('delete'), false);
}

testFindingMarksOnlyStayLoudWhileActionable();
testDiffMarksDoNotRepeatAfterDecision();
testConfirmationProgressIgnoresAutoPassTotal();
testPaperMarksHaveSinglePrimaryLayer();
console.log('Accepted finding visual-noise tests passed');
