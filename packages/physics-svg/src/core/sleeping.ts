import type { PhysicsBody } from '@mcp-tool-shop/siege-types';
import * as V from './vec2.js';

// ---------------------------------------------------------------------------
// Sleep System
// ---------------------------------------------------------------------------

/** Speed below which a body starts accumulating sleep time (px/step). */
const SLEEP_VELOCITY_THRESHOLD = 0.5;

/** Number of consecutive frames below threshold before sleeping. */
const SLEEP_FRAME_THRESHOLD = 30;

/**
 * Update the sleep state of a body based on its velocity.
 *
 * - If speed < threshold for SLEEP_FRAME_THRESHOLD frames → sleep
 * - If sleeping and speed > threshold → wake
 */
export function updateSleepState(body: PhysicsBody): void {
  if (body.isStatic) return;

  const speed = V.length(body.velocity);

  if (speed < SLEEP_VELOCITY_THRESHOLD) {
    body.sleepTimer++;
    if (body.sleepTimer >= SLEEP_FRAME_THRESHOLD) {
      body.isSleeping = true;
      body.velocity.x = 0;
      body.velocity.y = 0;
    }
  } else {
    body.sleepTimer = 0;
    body.isSleeping = false;
  }
}

/**
 * Force a body awake. Called when:
 * - A constraint references it
 * - A collision involves it and the colliding body is awake
 * - An external force or impulse is applied
 */
export function wakeBody(body: PhysicsBody): void {
  body.isSleeping = false;
  body.sleepTimer = 0;
}

/**
 * Wake both bodies involved in a collision if either is awake.
 */
export function wakeOnCollision(a: PhysicsBody, b: PhysicsBody): void {
  if (a.isSleeping && !b.isSleeping && !b.isStatic) {
    wakeBody(a);
  }
  if (b.isSleeping && !a.isSleeping && !a.isStatic) {
    wakeBody(b);
  }
}
