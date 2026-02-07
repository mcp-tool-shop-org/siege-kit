import type { PhysicsBody, Vec2 } from '@mcp-tool-shop/siege-types';

/**
 * Apply a gravitational acceleration to a body.
 *
 * Gravity is mass-independent (all objects fall at the same rate), so we add
 * the gravity vector directly to the body's acceleration.
 */
export function applyGravity(body: PhysicsBody, gravity: Vec2): void {
  body.acceleration.x += gravity.x;
  body.acceleration.y += gravity.y;
}

/**
 * Apply a simple linear drag force opposing the body's velocity.
 *
 * drag_force = -coefficient * velocity
 * acceleration += drag_force / mass
 */
export function applyDrag(body: PhysicsBody, coefficient: number): void {
  if (body.mass <= 0) return;

  const dragAx = (-coefficient * body.velocity.x) / body.mass;
  const dragAy = (-coefficient * body.velocity.y) / body.mass;

  body.acceleration.x += dragAx;
  body.acceleration.y += dragAy;
}
