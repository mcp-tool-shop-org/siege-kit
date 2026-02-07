import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Panel } from './Panel';

const root = document.getElementById('panel-root');
if (!root) throw new Error('Panel root element not found');

createRoot(root).render(
  <StrictMode>
    <Panel />
  </StrictMode>,
);
