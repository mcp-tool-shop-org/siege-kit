import type { AnimationEvent } from '@mcp-tool-shop/siege-types';

/** Callback signature for animation event subscribers. */
export type AnimationEventCallback = (event: AnimationEvent) => void;

/**
 * AnimationEmitter — a lightweight pub/sub emitter for animation events
 * consumed by the devtools panel.
 */
export class AnimationEmitter {
  private subscribers: AnimationEventCallback[] = [];

  /** Emit an animation event to all current subscribers. */
  emit(event: AnimationEvent): void {
    for (const callback of this.subscribers) {
      callback(event);
    }
  }

  /**
   * Subscribe to animation events.
   *
   * @returns An unsubscribe function.
   */
  subscribe(callback: AnimationEventCallback): () => void {
    this.subscribers.push(callback);

    return () => {
      const idx = this.subscribers.indexOf(callback);
      if (idx !== -1) {
        this.subscribers.splice(idx, 1);
      }
    };
  }
}
