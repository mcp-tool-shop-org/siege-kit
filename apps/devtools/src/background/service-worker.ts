import { PORT_NAME } from '../shared/messaging';
import type { PageToDevToolsMessage, DevToolsToPageMessage } from '@mcp-tool-shop/siege-types';

/**
 * Background service worker for the Animation DevTools extension.
 *
 * Routes messages between the devtools panel and content scripts.
 * Each inspected tab has at most one panel port and one content port.
 */

// Maps tab ID -> panel port (the devtools panel for that tab)
const panelPorts = new Map<number, chrome.runtime.Port>();

// Maps tab ID -> content script port
const contentPorts = new Map<number, chrome.runtime.Port>();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAME) return;

  // The devtools panel sends an "init" message with the inspected tab ID.
  // Content scripts send a "content-init" message with their tab ID.
  port.onMessage.addListener((message: { type: string; tabId?: number }) => {
    if (message.type === 'panel-init' && message.tabId != null) {
      panelPorts.set(message.tabId, port);

      port.onDisconnect.addListener(() => {
        panelPorts.delete(message.tabId!);
      });

      // Forward subsequent messages from the panel to the content script
      port.onMessage.addListener((msg: DevToolsToPageMessage) => {
        const contentPort = contentPorts.get(message.tabId!);
        if (contentPort) {
          contentPort.postMessage(msg);
        }
      });
    }

    if (message.type === 'content-init' && message.tabId != null) {
      contentPorts.set(message.tabId, port);

      port.onDisconnect.addListener(() => {
        contentPorts.delete(message.tabId!);
      });

      // Forward subsequent messages from content script to the panel
      port.onMessage.addListener((msg: PageToDevToolsMessage) => {
        const panelPort = panelPorts.get(message.tabId!);
        if (panelPort) {
          panelPort.postMessage(msg);
        }
      });
    }
  });
});

// TODO -- handle tab removal to clean up stale port references
chrome.tabs.onRemoved.addListener((tabId) => {
  panelPorts.delete(tabId);
  contentPorts.delete(tabId);
});
