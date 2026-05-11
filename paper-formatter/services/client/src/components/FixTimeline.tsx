import React from 'react';
import { FixRuntimeActionFeed } from './fix-runtime/FixRuntimeActionFeed';
import { FixRuntimePaperStage } from './fix-runtime/FixRuntimePaperStage';
import { FixRuntimeRulesAside } from './fix-runtime/FixRuntimeRulesAside';
import { FixRuntimeTopbar } from './fix-runtime/FixRuntimeTopbar';
import type { FixTimelineProps } from './fix-runtime/types';
import { useFixRuntimePlayback } from './fix-runtime/useFixRuntimePlayback';

export const FixTimeline: React.FC<FixTimelineProps> = ({
  runtimeStore,
  runtimeNarrative,
  documentTitle,
  activeFrame,
  paperContent,
  fixActions,
  fixEvents,
  fixArtifacts,
  onPauseToggle,
  onSpeedChange,
  onJumpToComplete,
  onViewDiff,
}) => {
  const playback = useFixRuntimePlayback({
    runtimeStore,
    runtimeNarrative,
    documentTitle,
    activeFrame,
    paperContent,
    fixActions,
    fixEvents,
    fixArtifacts,
    onPauseToggle,
  });

  return (
    <section className={`fix-runtime-shell speed-${playback.visualRuntimeStore.speed}`}>
      <FixRuntimeTopbar
        runtimeStore={playback.visualRuntimeStore}
        documentTitle={documentTitle}
        displayedPageNumber={playback.displayedPageNumber}
        displayedChapter={playback.displayedChapter}
        onPauseToggle={onPauseToggle}
        onSpeedChange={onSpeedChange}
        onJumpToComplete={onJumpToComplete}
      />

      <div className="fix-runtime-stage">
        <FixRuntimeRulesAside
          isPageFlipping={playback.isPageFlipping}
          leftRules={playback.leftRules}
          hiddenRuleCount={playback.hiddenRuleCount}
          ruleFlashId={playback.ruleFlashId}
        />

        <FixRuntimePaperStage
          runtimeStore={playback.visualRuntimeStore}
          currentPaperPage={playback.currentPaperPage}
          previousPage={playback.previousPage}
          isPageFlipping={playback.isPageFlipping}
          paperBow={playback.paperBow}
          pageDecorations={playback.pageDecorations}
          annotationLayouts={playback.annotationLayouts}
          activeActionSet={playback.activeActionSet}
          activeParagraphKey={playback.activeParagraphKey}
          currentPageActions={playback.currentPageActions}
          recentActionMeta={playback.recentActionMeta}
          annotationStateMap={playback.annotationStateMap}
          freshInsertIds={playback.freshInsertIds}
          charRefs={playback.charRefs}
          livePageRef={playback.livePageRef}
          showPauseHint={playback.showPauseHint}
          penPosition={playback.penPosition}
          penState={playback.penState}
          penTransitionMs={playback.penTransitionMs}
        />

        <FixRuntimeActionFeed
          runtimeStore={playback.visualRuntimeStore}
          appliedCount={playback.appliedCount}
          fixActionsLength={fixActions.length}
          timelineRows={playback.timelineRows}
          viewDiffEnabled={playback.viewDiffEnabled}
          diffPulse={playback.diffPulse}
          rightFeedRef={playback.rightFeedRef}
          onScroll={playback.handleRightFeedScroll}
          onJumpToAction={playback.handleJumpToAction}
          onViewDiff={onViewDiff}
        />
      </div>
    </section>
  );
};
