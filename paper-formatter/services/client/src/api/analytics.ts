const VITE_API_BASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  '';
const ANALYTICS_ENDPOINT = `${VITE_API_BASE_URL}/api/v1/analytics/track`;

export type ShareSource = 'result_page' | 'fix_complete' | 'export_page';

export interface TrackEvent {
  event: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

function send(event: string, payload?: Record<string, unknown>) {
  const body: TrackEvent = { event, payload, timestamp: new Date().toISOString() };
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ANALYTICS_ENDPOINT, JSON.stringify(body));
    } else {
      fetch(ANALYTICS_ENDPOINT, {
        method: 'POST', body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Analytics must never break the app
  }
}

export const analytics = {
  shareClick: (source: ShareSource) => send('share_click', { source }),
  shareCopyLink: (source: ShareSource) => send('share_copy_link', { source }),
  shareGeneratePoster: (source: ShareSource) => send('share_generate_poster', { source }),
};
