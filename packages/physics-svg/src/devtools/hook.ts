/**
 * DevTools global hook installer.
 *
 * When a companion browser devtools extension is detected, this module
 * installs a global hook that the extension can use to inspect and control
 * the physics engine at runtime.
 */

import type { PhysicsBody, Constraint } from '@mcp-tool-shop/siege-types';

/** Shape of the global devtools hook. */
export interface PhysicsSvgDevToolsHook {
  /** Version of the hook protocol. */
  version: number;
  /** Retrieve the current list of bodies. */
  getBodies: () => PhysicsBody[];
  /** Retrieve the current list of constraints. */
  getConstraints: () => Constraint[];
  /** Pause / resume the simulation. */
  setPaused: (paused: boolean) => void;
  /** Step exactly one frame while paused. */
  stepOnce: () => void;
}

declare global {
  interface Window {
    __PHYSICS_SVG_DEVTOOLS_HOOK__?: PhysicsSvgDevToolsHook;
  }
}

/**
 * Install the global devtools hook on `window`.
 *
 * Call this once during engine initialisation. The hook exposes read-only
 * accessors and a pause/step API so the devtools panel can inspect the
 * simulation without importing engine internals.
 *
 * @param hooks - Object implementing the hook interface.
 */
export function installDevToolsHook(
  hooks: PhysicsSvgDevToolsHook,
): void {
  if (typeof window === 'undefined') return;

  window.__PHYSICS_SVG_DEVTOOLS_HOOK__ = hooks;

  // TODO: dispatch a custom event so the devtools extension knows
  // the hook is available.
}
