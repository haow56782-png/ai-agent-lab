import React, { useReducer, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { AppCtx, initialState } from './components/AppFrame';
import type { AppState } from './components/AppFrame';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Toast } from './components/Common';
import Step1Upload from './screens/Step1Upload';
import Step2Profile from './screens/Step2Profile';
import Step3Parse from './screens/Step3Parse';
import Step4Fix from './screens/Step4Fix';
import Step4Diff from './screens/Step4Diff';
import Step5Output from './screens/Step5Output';
import { loadBootstrappedAppState } from './test-support/bootstrapAppState';
import { reviewActions } from './stores/reviewStore';

function reducer(s: AppState, patch: Partial<AppState> | { __reset: true }): AppState {
  if ('__reset' in patch) return { ...initialState };
  return { ...s, ...patch };
}

function useAppToast() {
  const [t, setT] = useState<string | null>(null);
  const show = useCallback((msg: string) => {
    setT(msg);
    setTimeout(() => setT(null), 2400);
  }, []);
  return { toast: t, show };
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, undefined, loadBootstrappedAppState);
  const set = useCallback((patch: Partial<AppState>) => dispatch(patch), []);
  const { toast, show: showToast } = useAppToast();
  const prevStepRef = useRef(state.step);
  const stepDirRef = useRef<'fwd' | 'bwd'>('fwd');

  if (state.step !== prevStepRef.current) {
    stepDirRef.current = state.step > prevStepRef.current ? 'fwd' : 'bwd';
    prevStepRef.current = state.step;
  }

  useEffect(() => {
    window.requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>('[data-step-scroll-root]').forEach((node) => {
        node.scrollTo({ top: 0, behavior: 'auto' });
      });
    });
  }, [state.step]);

  const stepAnim = stepDirRef.current === 'fwd'
    ? 'protoFade .28s var(--ease-emphasized-out), protoSlideIn .32s var(--ease-emphasized)'
    : 'protoFade .28s var(--ease-emphasized-out), protoSlideOut .32s var(--ease-emphasized)';

  const ctx = useMemo(() => ({ state, set }), [state, set]);

  return (
    <AppCtx.Provider value={ctx}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '212px 1fr',
        height: '100vh', minHeight: 0,
      }}>
        <Sidebar state={state} />
        <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          <TopBar
            state={state}
            onStep={(s) => set({ step: s })}
            onReset={() => {
              reviewActions.reset();
              dispatch({ __reset: true } as any);
            }}
          />
          <div key={state.step} style={{
            flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative',
            animation: stepAnim,
          }}>
            {state.step === 1 && <Step1Upload showToast={showToast} />}
            {state.step === 2 && <Step2Profile showToast={showToast} />}
            {state.step === 3 && <Step3Parse showToast={showToast} />}
            {state.step === 4 && <Step4Fix showToast={showToast} />}
            {state.step === 5 && <Step4Diff showToast={showToast} />}
            {state.step === 6 && <Step5Output showToast={showToast} />}
          </div>
        </main>
      </div>
      <Toast text={toast} />
    </AppCtx.Provider>
  );
};

export default App;
