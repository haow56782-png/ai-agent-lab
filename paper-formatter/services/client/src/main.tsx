import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

function mountApp() {
  const root = document.getElementById('root');
  if (!root) {
    document.body.innerHTML = '<div style="padding:40px;color:red;font-family:monospace">ERROR: #root element not found</div>';
    return;
  }

  try {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (e: any) {
    root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:12px;padding:40px;font-family:monospace;color:#9C4421;background:#F4F0E6;text-align:center">
      <h2 style="margin:0;font-size:18px;font-weight:600">⨯ React Render Error</h2>
      <pre style="margin:0;font-size:12px;color:#6B655B;max-width:600px;white-space:pre-wrap">${e.message + '\n' + (e.stack?.split('\n').slice(0, 6).join('\n') || '')}</pre>
      <div style="margin-top:8px;font-size:11px;color:#8E867A">${navigator.userAgent}</div>
      <button onclick="location.reload()" style="margin-top:8px;padding:8px 16px;border:1px solid #B6AE9F;background:#FBFAF6;border-radius:4px;cursor:pointer;font-family:monospace;font-size:12px">重新加载</button>
    </div>`;
  }
}

mountApp();
