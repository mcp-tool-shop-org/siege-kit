import type { PageToDevToolsMessage } from '@mcp-tool-shop/siege-types';
import { createPort, PAGE_MESSAGE_SOURCE } from '../shared/messaging';
import type { WindowMessage } from '../shared/messaging';

/**
 * Content script injected into the inspected page (ISOLATED world).
 *
 * Responsibilities:
 * 1. Inject page-hook.ts into the MAIN world so it can intercept native APIs
 * 2. Listen for animation events from the page hook via window.postMessage
 * 3. Forward those events to the background service worker via a named port
 */

// -- Connect to background service worker
const port = createPort();
port.postMessage({ type: 'content-init', tabId: chrome.devtools?.inspectedWindow?.tabId });

// -- Inject the page hook into the MAIN world
function injectPageHook(): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/content/page-hook.ts');
  script.type = 'module';
  (document.head ?? document.documentElement).appendChild(script);
  script.addEventListener('load', () => {
    script.remove();
  });
}

injectPageHook();

// -- Listen for messages from the page hook (MAIN world -> ISOLATED world)
window.addEventListener('message', (event: MessageEvent<WindowMessage>) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  // Verify the message is from our page hook
  if (event.data?.source !== PAGE_MESSAGE_SOURCE) return;

  const message: PageToDevToolsMessage = event.data.payload;
  port.postMessage(message);
});

// -- Forward commands from background (panel) to the page hook
port.onMessage.addListener((message) => {
  // Post commands to the page hook in the MAIN world
  window.postMessage(
    { source: PAGE_MESSAGE_SOURCE, payload: message },
    '*',
  );
});
