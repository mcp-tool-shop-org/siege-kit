/**
 * Shared message protocol constants and helpers for the Animation DevTools extension.
 *
 * All communication between the panel, background service worker, and content script
 * flows through named ports using this shared port name.
 */

export type {
  PageToDevToolsMessage,
  DevToolsToPageMessage,
  AnimationEvent,
  AnimationTimeline,
  AnimationPerformance,
  WorldSnapshot,
} from '@mcp-tool-shop/siege-types';

/** Port name used for all chrome.runtime.connect calls */
export const PORT_NAME = 'animation-devtools';

/** Message channel identifier for window.postMessage in the page world */
export const PAGE_MESSAGE_SOURCE = '__ANIM_DEVTOOLS__' as const;

/**
 * Wrapper message format used between page-hook <-> content-script
 * via window.postMessage.
 */
export interface WindowMessage {
  source: typeof PAGE_MESSAGE_SOURCE;
  payload: import('@mcp-tool-shop/siege-types').PageToDevToolsMessage;
}

/** Create a named port connection to the background service worker */
export function createPort(): chrome.runtime.Port {
  return chrome.runtime.connect({ name: PORT_NAME });
}

/** Send a message to the panel port for a given tab (called from background) */
export function sendToPanel(
  panelPorts: Map<number, chrome.runtime.Port>,
  tabId: number,
  message: import('@mcp-tool-shop/siege-types').PageToDevToolsMessage,
): void {
  const port = panelPorts.get(tabId);
  if (port) {
    port.postMessage(message);
  }
}

/** Send a message to the content script port for a given tab (called from background) */
export function sendToPage(
  contentPorts: Map<number, chrome.runtime.Port>,
  tabId: number,
  message: import('@mcp-tool-shop/siege-types').DevToolsToPageMessage,
): void {
  const port = contentPorts.get(tabId);
  if (port) {
    port.postMessage(message);
  }
}
