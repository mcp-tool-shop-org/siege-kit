import type { PhysicsBody, Vec2, ForceField } from '@mcp-tool-shop/siege-types';
import * as V from './vec2.js';

/**
 * Apply gravity as constant acceleration (mass-independent).
 */
export function applyGravity(body: PhysicsBody, gravity: Vec2): void {
  body.acceleration.x += gravity.x;
  body.acceleration.y += gravity.y;
}

/**
 * Apply linear drag: F_drag = -coefficient × velocity.
 */
export function applyDrag(body: PhysicsBody, coefficient: number): void {
  if (body.invMass <= 0) return;
  body.acceleration.x += (-coefficient * body.velocity.x) * body.invMass;
  body.acceleration.y += (-coefficient * body.velocity.y) * body.invMass;
}

/**
 * Apply a constant directional wind force.
 */
export function applyWind(
  body: PhysicsBody,
  direction: Vec2,
  strength: number,
): void {
  if (body.invMass <= 0) return;
  body.acceleration.x += direction.x * strength * body.invMass;
  body.acceleration.y += direction.y * strength * body.invMass;
}

/**
 * Apply attraction/repulsion toward a point.
 */
export function applyAttraction(
  body: PhysicsBody,
  point: Vec2,
  strength: number,
  falloff: 'none' | 'linear' | 'quadratic' = 'quadratic',
): void {
  if (body.invMass <= 0) return;

  const delta = V.sub(point, body.position);
  const distSq = V.lengthSq(delta);
  const MIN_DIST_SQ = 100;
  const clampedDistSq = Math.max(distSq, MIN_DIST_SQ);
  const dist = Math.sqrt(clampedDistSq);
  const direction = V.scale(delta, 1 / dist);

  let forceMag: number;
  switch (falloff) {
    case 'none':
      forceMag = strength;
      break;
    case 'linear':
      forceMag = strength / dist;
      break;
    case 'quadratic':
      forceMag = strength / clampedDistSq;
      break;
  }

  body.acceleration.x += direction.x * forceMag * body.invMass;
  body.acceleration.y += direction.y * forceMag * body.invMass;
}

/**
 * Apply all ForceField objects to a body.
 */
export function applyForceFields(
  body: PhysicsBody,
  fields: ForceField[],
  gravity: Vec2,
): void {
  for (const field of fields) {
    switch (field.type) {
      case 'gravity':
        applyGravity(body, field.vector ?? gravity);
        break;
      case 'drag':
        applyDrag(body, field.strength ?? 0.01);
        break;
      case 'wind':
        if (field.vector) applyWind(body, field.vector, field.strength ?? 1);
        break;
      case 'attraction':
        if (field.vector) {
          applyAttraction(body, field.vector, field.strength ?? 100, field.falloff ?? 'quadratic');
        }
        break;
    }
  }
}
