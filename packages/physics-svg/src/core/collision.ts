import type { PhysicsBody, Vec2 } from '@mcp-tool-shop/siege-types';
import * as V from './vec2.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CollisionPair {
  bodyA: string;
  bodyB: string;
  normal: Vec2; // points from A to B
  penetration: number;
  overlap: Vec2; // penetration * normal
}

// ---------------------------------------------------------------------------
// Detection (Broad + Narrow)
// ---------------------------------------------------------------------------

/**
 * Detect all collisions between bodies.
 *
 * Brute-force O(n²) — adequate for ~30-100 bodies.
 */
export function detectCollisions(bodies: PhysicsBody[]): CollisionPair[] {
  const pairs: CollisionPair[] = [];

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i]!;
      const b = bodies[j]!;

      if (a.isStatic && b.isStatic) continue;
      if (a.isSleeping && b.isSleeping) continue;

      const pair = testPair(a, b);
      if (pair) pairs.push(pair);
    }
  }

  return pairs;
}

function testPair(a: PhysicsBody, b: PhysicsBody): CollisionPair | null {
  const aType = a.shape.type;
  const bType = b.shape.type;

  if (aType === 'circle' && bType === 'circle') {
    return circleVsCircle(a, b);
  }

  if (aType === 'circle' && bType === 'rect') {
    return circleVsRect(a, b);
  }
  if (aType === 'rect' && bType === 'circle') {
    const result = circleVsRect(b, a);
    if (result) {
      return {
        bodyA: a.id,
        bodyB: b.id,
        normal: V.negate(result.normal),
        penetration: result.penetration,
        overlap: V.negate(result.overlap),
      };
    }
    return null;
  }

  if (aType === 'rect' && bType === 'rect') {
    return rectVsRect(a, b);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Circle vs Circle
// ---------------------------------------------------------------------------

function circleVsCircle(a: PhysicsBody, b: PhysicsBody): CollisionPair | null {
  if (a.shape.type !== 'circle' || b.shape.type !== 'circle') return null;

  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const distSq = dx * dx + dy * dy;
  const sumRadii = a.shape.radius + b.shape.radius;

  if (distSq >= sumRadii * sumRadii) return null;

  const dist = Math.sqrt(distSq);
  const normal: Vec2 =
    dist < 1e-10 ? { x: 0, y: 1 } : { x: dx / dist, y: dy / dist };
  const penetration = sumRadii - dist;

  return {
    bodyA: a.id,
    bodyB: b.id,
    normal,
    penetration,
    overlap: V.scale(normal, penetration),
  };
}

// ---------------------------------------------------------------------------
// Circle vs Rect (AABB)
// ---------------------------------------------------------------------------

function circleVsRect(
  circle: PhysicsBody,
  rect: PhysicsBody,
): CollisionPair | null {
  if (circle.shape.type !== 'circle' || rect.shape.type !== 'rect') return null;

  const hw = rect.shape.width / 2;
  const hh = rect.shape.height / 2;
  const dx = circle.position.x - rect.position.x;
  const dy = circle.position.y - rect.position.y;

  const closestX = Math.max(-hw, Math.min(hw, dx));
  const closestY = Math.max(-hh, Math.min(hh, dy));

  const diffX = dx - closestX;
  const diffY = dy - closestY;
  const distSq = diffX * diffX + diffY * diffY;
  const radius = circle.shape.radius;

  if (distSq >= radius * radius) return null;

  const dist = Math.sqrt(distSq);
  let normal: Vec2;
  let penetration: number;

  if (dist < 1e-10) {
    const overlapX = hw - Math.abs(dx);
    const overlapY = hh - Math.abs(dy);
    if (overlapX < overlapY) {
      normal = { x: dx > 0 ? 1 : -1, y: 0 };
    } else {
      normal = { x: 0, y: dy > 0 ? 1 : -1 };
    }
    penetration = radius + Math.min(overlapX, overlapY);
  } else {
    normal = { x: diffX / dist, y: diffY / dist };
    penetration = radius - dist;
  }

  return {
    bodyA: circle.id,
    bodyB: rect.id,
    normal,
    penetration,
    overlap: V.scale(normal, penetration),
  };
}

// ---------------------------------------------------------------------------
// Rect vs Rect (AABB)
// ---------------------------------------------------------------------------

function rectVsRect(a: PhysicsBody, b: PhysicsBody): CollisionPair | null {
  if (a.shape.type !== 'rect' || b.shape.type !== 'rect') return null;

  const ahw = a.shape.width / 2;
  const ahh = a.shape.height / 2;
  const bhw = b.shape.width / 2;
  const bhh = b.shape.height / 2;

  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;

  const overlapX = ahw + bhw - Math.abs(dx);
  if (overlapX <= 0) return null;

  const overlapY = ahh + bhh - Math.abs(dy);
  if (overlapY <= 0) return null;

  let normal: Vec2;
  let penetration: number;

  if (overlapX < overlapY) {
    normal = { x: dx > 0 ? 1 : -1, y: 0 };
    penetration = overlapX;
  } else {
    normal = { x: 0, y: dy > 0 ? 1 : -1 };
    penetration = overlapY;
  }

  return {
    bodyA: a.id,
    bodyB: b.id,
    normal,
    penetration,
    overlap: V.scale(normal, penetration),
  };
}

// ---------------------------------------------------------------------------
// Resolution (Impulse-Based)
// ---------------------------------------------------------------------------

const PENETRATION_SLOP = 0.5;
const CORRECTION_FACTOR = 0.4;
const RESTITUTION_SLOP = 0.5;

/**
 * Resolve a collision with impulse + friction + positional correction.
 */
export function resolveCollision(
  a: PhysicsBody,
  b: PhysicsBody,
  pair: CollisionPair,
): void {
  const { normal, penetration } = pair;

  const relVelX = b.velocity.x - a.velocity.x;
  const relVelY = b.velocity.y - a.velocity.y;
  const normalSpeed = relVelX * normal.x + relVelY * normal.y;

  // Separating — no impulse needed
  if (normalSpeed > 0) return;

  let e = Math.min(a.restitution, b.restitution);
  if (Math.abs(normalSpeed) < RESTITUTION_SLOP) e = 0;

  const totalInvMass = a.invMass + b.invMass;
  if (totalInvMass < 1e-10) return;

  // Normal impulse
  const j = -(1 + e) * normalSpeed / totalInvMass;

  a.velocity.x -= j * a.invMass * normal.x;
  a.velocity.y -= j * a.invMass * normal.y;
  b.velocity.x += j * b.invMass * normal.x;
  b.velocity.y += j * b.invMass * normal.y;

  // Friction impulse (tangential)
  let tangentX = relVelX - normalSpeed * normal.x;
  let tangentY = relVelY - normalSpeed * normal.y;
  const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY);

  if (tangentLen > 1e-10) {
    tangentX /= tangentLen;
    tangentY /= tangentLen;

    const mu = Math.sqrt(a.friction * b.friction); // Pythagorean mixing
    const tangentSpeed = relVelX * tangentX + relVelY * tangentY;
    let jt = -tangentSpeed / totalInvMass;

    // Coulomb clamp
    if (Math.abs(jt) > Math.abs(j * mu)) {
      jt = j * mu * Math.sign(jt);
    }

    a.velocity.x -= jt * a.invMass * tangentX;
    a.velocity.y -= jt * a.invMass * tangentY;
    b.velocity.x += jt * b.invMass * tangentX;
    b.velocity.y += jt * b.invMass * tangentY;
  }

  // Positional correction (Baumgarte stabilization)
  const corrMag =
    (Math.max(penetration - PENETRATION_SLOP, 0) * CORRECTION_FACTOR) /
    totalInvMass;

  a.position.x -= corrMag * a.invMass * normal.x;
  a.position.y -= corrMag * a.invMass * normal.y;
  b.position.x += corrMag * b.invMass * normal.x;
  b.position.y += corrMag * b.invMass * normal.y;
}
