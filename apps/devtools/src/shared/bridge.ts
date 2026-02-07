import type { PageToDevToolsMessage, DevToolsToPageMessage } from '@mcp-tool-shop/siege-types';
import { PORT_NAME } from './messaging';

type MessageCallback = (message: PageToDevToolsMessage) => void;

/**
 * Bridge abstraction for DevTools panel <-> inspected page communication.
 *
 * The bridge connects to the background service worker, identifies itself
 * with the inspected tab ID, and provides a clean API for sending commands
 * to the page and receiving animation events.
 */
export class DevToolsBridge {
  private port: chrome.runtime.Port | null = null;
  private listeners: Set<MessageCallback> = new Set();
  private tabId: number | null = null;

  /**
   * Connect to the background service worker and register for the given tab.
   */
  connect(tabId: number): void {
    if (this.port) {
      this.disconnect();
    }

    this.tabId = tabId;
    this.port = chrome.runtime.connect({ name: PORT_NAME });

    // Identify this port as the panel for the given tab
    this.port.postMessage({ type: 'panel-init', tabId });

    this.port.onMessage.addListener((message: PageToDevToolsMessage) => {
      for (const callback of this.listeners) {
        callback(message);
      }
    });

    this.port.onDisconnect.addListener(() => {
      this.port = null;
      // TODO -- auto-reconnect logic
    });
  }

  /**
   * Disconnect from the background service worker.
   */
  disconnect(): void {
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
    this.tabId = null;
  }

  /**
   * Subscribe to messages from the inspected page.
   * Returns an unsubscribe function.
   */
  onMessage(callback: MessageCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Send a command message to the inspected page.
   */
  send(message: DevToolsToPageMessage): void {
    if (!this.port) {
      console.warn('[DevToolsBridge] Not connected, cannot send message');
      return;
    }
    this.port.postMessage(message);
  }

  /**
   * Whether the bridge is currently connected.
   */
  get connected(): boolean {
    return this.port !== null;
  }

  /**
   * The tab ID this bridge is connected to.
   */
  get inspectedTabId(): number | null {
    return this.tabId;
  }
}
