import React, { useMemo } from 'react';
import { useApp, findSchoolById } from '../components/AppFrame';
import { FixTimeline } from '../components/FixTimeline';
import { FixPaywallCard } from '../components/FixPaywallCard';
import { PAYWALL_PRICE } from './step4-fix/constants';
import { useFixFlowController } from './step4-fix/useFixFlowController';

interface Props {
  showToast: (msg: string) => void;
}

const Step4Fix: React.FC<Props> = ({ showToast }) => {
  const { state, set } = useApp();

  const school = useMemo(() => findSchoolById(state.schoolId), [state.schoolId]);
  const controller = useFixFlowController({
    state,
    set,
    school,
    showToast,
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
      <FixTimeline
        runtimeStore={controller.runtimeStore}
        runtimeNarrative={controller.runtimeNarrative}
        documentTitle={controller.documentTitle}
        activeFrame={controller.activeLiveFrame}
        paperContent={controller.paperContent}
        fixActions={controller.fixActions}
        fixEvents={controller.fixEvents}
        fixArtifacts={controller.fixArtifacts}
        onPauseToggle={controller.onPauseToggle}
        onSpeedChange={controller.onSpeedChange}
        onJumpToComplete={controller.onJumpToComplete}
        onViewDiff={() => set({ step: 5 })}
        onStartFix={controller.onStartFix}
      />
      {controller.showPaywall && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'rgba(0,0,0,.24)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <FixPaywallCard
            freeFixLimit={controller.freeFixLimit}
            totalCount={controller.totalCount}
            paywallPrice={PAYWALL_PRICE}
            onPay={controller.onPay}
            onSkip={controller.onSkipPay}
          />
        </div>
      )}
    </div>
  );
};

export default Step4Fix;
