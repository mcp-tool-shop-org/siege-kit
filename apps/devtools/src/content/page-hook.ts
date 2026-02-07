/**
 * Page hook injected into the MAIN world of the inspected page.
 *
 * This script runs in the page's own JavaScript context, allowing it to
 * intercept native animation APIs and expose animation data to DevTools.
 *
 * Communication: page-hook -> window.postMessage -> content-script -> background -> panel
 */

import type {
  AnimationTimeline,
  AnimationDescriptor,
  AnimationEvent as DevToolsAnimationEvent,
  PageToDevToolsMessage,
} from '@mcp-tool-shop/siege-types';

const MESSAGE_SOURCE = '__ANIM_DEVTOOLS__' as const;

let nextAnimationId = 1;

/** Post a message to the content script (ISOLATED world) */
function postToContentScript(message: PageToDevToolsMessage): void {
  window.postMessage({ source: MESSAGE_SOURCE, payload: message }, '*');
}

/** Generate a CSS selector for an element (best-effort) */
function getSelectorForElement(el: Element): string {
  if (el.id) return `#${el.id}`;
  if (el.className && typeof el.className === 'string') {
    return `${el.tagName.toLowerCase()}.${el.className.split(/\s+/).join('.')}`;
  }
  return el.tagName.toLowerCase();
}

// --------------------------------------------------------------------------
// Web Animations API hook
// --------------------------------------------------------------------------

const originalAnimate = Element.prototype.animate;

Element.prototype.animate = function hookedAnimate(
  this: Element,
  keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
  options?: number | KeyframeAnimationOptions,
): Animation {
  const animation = originalAnimate.call(this, keyframes, options);
  const animId = `wa-${nextAnimationId++}`;

  const descriptor: AnimationDescriptor = {
    id: animId,
    name: typeof options === 'object' ? options.id : undefined,
    source: 'web-animations',
    targetSelector: getSelectorForElement(this),
    targetElement: this.tagName.toLowerCase(),
  };

  const duration =
    typeof options === 'number'
      ? options
      : typeof options === 'object' && typeof options.duration === 'number'
        ? options.duration
        : 0;

  const timeline: AnimationTimeline = {
    id: animId,
    descriptor,
    duration,
    currentTime: 0,
    playbackRate: animation.playbackRate,
    state: 'running',
    startTime: performance.now(),
    keyframes: [], // TODO -- extract keyframe snapshots
  };

  const event: DevToolsAnimationEvent = {
    type: 'animation:created',
    timestamp: performance.now(),
    animation: timeline,
  };

  postToContentScript({ type: 'ANIMATION_EVENT', payload: event });

  // Track lifecycle events
  animation.addEventListener('finish', () => {
    postToContentScript({
      type: 'ANIMATION_EVENT',
      payload: {
        type: 'animation:finished',
        timestamp: performance.now(),
        animation: { ...timeline, state: 'finished' },
      },
    });
  });

  animation.addEventListener('cancel', () => {
    postToContentScript({
      type: 'ANIMATION_EVENT',
      payload: {
        type: 'animation:cancelled',
        timestamp: performance.now(),
        animation: { ...timeline, state: 'idle' },
      },
    });
  });

  return animation;
};

// --------------------------------------------------------------------------
// Physics SVG devtools hook
// --------------------------------------------------------------------------

interface PhysicsDevToolsHook {
  getWorldSnapshot: () => {
    bodies: unknown[];
    constraints: unknown[];
    timestamp: number;
  };
  onUpdate: (callback: (snapshot: unknown) => void) => () => void;
}

// Check for the physics engine hook exposed by physics-svg
function connectPhysicsHook(): void {
  const hook = (
    window as unknown as Record<string, PhysicsDevToolsHook | undefined>
  ).__PHYSICS_SVG_DEVTOOLS_HOOK__;

  if (!hook) {
    // TODO -- retry with MutationObserver or polling
    return;
  }

  // Request initial snapshot
  const snapshot = hook.getWorldSnapshot();
  postToContentScript({
    type: 'PHYSICS_WORLD_SNAPSHOT',
    payload: {
      bodies: snapshot.bodies as import('@mcp-tool-shop/siege-types').PhysicsBody[],
      constraints: snapshot.constraints as import('@mcp-tool-shop/siege-types').Constraint[],
      timestamp: snapshot.timestamp,
    },
  });

  // Subscribe to updates
  hook.onUpdate((update) => {
    // TODO -- throttle updates to avoid flooding the message channel
    const typedUpdate = update as {
      bodies: import('@mcp-tool-shop/siege-types').PhysicsBody[];
      constraints: import('@mcp-tool-shop/siege-types').Constraint[];
      timestamp: number;
    };
    postToContentScript({
      type: 'PHYSICS_WORLD_SNAPSHOT',
      payload: typedUpdate,
    });
  });
}

// Attempt to connect on load; the physics engine may not be initialized yet
if (document.readyState === 'complete') {
  connectPhysicsHook();
} else {
  window.addEventListener('load', connectPhysicsHook);
}

// --------------------------------------------------------------------------
// Listen for commands from DevTools panel (via content script)
// --------------------------------------------------------------------------

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;
  if (event.data?.source !== MESSAGE_SOURCE) return;

  // TODO -- handle DevToolsToPageMessage commands (pause, resume, seek, etc.)
  void event.data.payload;
});
