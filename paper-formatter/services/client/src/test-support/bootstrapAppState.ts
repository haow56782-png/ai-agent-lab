import { createDocumentIdentity, initialState, type AppState } from '../components/AppFrame';

export const APP_STATE_BOOTSTRAP_KEY = 'paper-formatter:e2e-bootstrap-state';

export function loadBootstrappedAppState(): AppState {
  if (typeof window === 'undefined') return initialState;

  try {
    const raw = window.sessionStorage.getItem(APP_STATE_BOOTSTRAP_KEY);
    if (!raw) return initialState;
    window.sessionStorage.removeItem(APP_STATE_BOOTSTRAP_KEY);
    const patch = JSON.parse(raw) as Partial<AppState> & { docId?: string | null; canonicalDocumentId?: string | null };
    const documentIdentity = patch.documentIdentity
      ?? (patch.docId ? createDocumentIdentity({
        legacyDocId: patch.docId,
        canonicalDocumentId: patch.canonicalDocumentId,
      }) : initialState.documentIdentity);
    return { ...initialState, ...patch, documentIdentity };
  } catch {
    return initialState;
  }
}
