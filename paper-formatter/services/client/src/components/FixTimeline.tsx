import React from 'react';
import { FixRuntimeActionFeed } from './fix-runtime/FixRuntimeActionFeed';
import { FixRuntimeManuscriptMap } from './fix-runtime/FixRuntimeManuscriptMap';
import { FixRuntimePaperStage } from './fix-runtime/FixRuntimePaperStage';
import { FixRuntimeScrubber } from './fix-runtime/FixRuntimeScrubber';
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
  onStartFix,
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
        findingStatusSummary={playback.findingStatusSummary}
        documentTitle={documentTitle}
        displayedPageNumber={playback.displayedPageNumber}
        displayedChapter={playback.displayedChapter}
        activeFinding={playback.activeFixFinding}
        onPauseToggle={onPauseToggle}
        onSpeedChange={onSpeedChange}
        onJumpToComplete={onJumpToComplete}
        onViewDiff={onViewDiff}
        onStartFix={onStartFix}
      />

      <div className="fix-runtime-stage">
        <FixRuntimeManuscriptMap
          runtimeStore={playback.visualRuntimeStore}
          timelineRows={playback.timelineRows}
          leftRules={playback.leftRules}
          hiddenRuleCount={playback.hiddenRuleCount}
          activeThesisSubset={playback.activeThesisSubset}
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
          findingStatusSummary={playback.findingStatusSummary}
          timelineRows={playback.timelineRows}
          viewDiffEnabled={playback.viewDiffEnabled}
          diffPulse={playback.diffPulse}
          rightFeedRef={playback.rightFeedRef}
          onScroll={playback.handleRightFeedScroll}
          onJumpToAction={playback.handleJumpToAction}
          onViewDiff={onViewDiff}
        />
      </div>

      <FixRuntimeScrubber
        runtimeStore={playback.visualRuntimeStore}
        timelineRows={playback.timelineRows}
        viewDiffEnabled={playback.viewDiffEnabled}
        onJumpToAction={playback.handleJumpToAction}
        onViewDiff={onViewDiff}
      />
    </section>
  );
};
