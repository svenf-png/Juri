import './ui/tokens/tokens.css';
import './ui/tokens/fonts.css';
import './ui/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { restoreDeepLink } from './app/deepLink';
import { isEmbedded } from './app/security';

const root = document.getElementById('root');
if (!root) throw new Error('#root fehlt in index.html');

if (isEmbedded(window)) {
  // Schutz gegen Einbetten in fremde Seiten (ADR-005); per Meta-CSP nicht möglich.
  root.textContent = 'Juri kann nicht in andere Seiten eingebettet werden.';
} else {
  restoreDeepLink(window.location, window.history, import.meta.env.BASE_URL);
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
