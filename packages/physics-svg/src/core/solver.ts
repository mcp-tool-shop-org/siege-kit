import type { PhysicsBody, Constraint, Vec2 } from '@mcp-tool-shop/siege-types';
import * as V from './vec2.js';

// ---------------------------------------------------------------------------
// Semi-Implicit Euler Integration
// ---------------------------------------------------------------------------

/**
 * Semi-implicit Euler integration step.
 *
 * 1. Save previous position (for render interpolation)
 * 2. velocity += acceleration × dt
 * 3. position += velocity × dt
 * 4. Reset acceleration to zero
 */
export function integrate(body: PhysicsBody, dt: number): void {
  // Save previous position for render interpolation
  body.previousPosition.x = body.position.x;
  body.previousPosition.y = body.position.y;

  // v += a * dt
  body.velocity.x += body.acceleration.x * dt;
  body.velocity.y += body.acceleration.y * dt;

  // p += v * dt
  body.position.x += body.velocity.x * dt;
  body.position.y += body.velocity.y * dt;

  // Reset acceleration — forces re-applied each step
  body.acceleration.x = 0;
  body.acceleration.y = 0;
}

// ---------------------------------------------------------------------------
// Constraint Solver (Projected Gauss-Seidel)
// ---------------------------------------------------------------------------

/**
 * Iteratively solve all constraints.
 *
 * Runs `iterations` passes over the constraint set. More iterations
 * yield stiffer/more accurate constraint satisfaction.
 */
export function solveConstraints(
  constraints: Map<string, Constraint>,
  bodies: Map<string, PhysicsBody>,
  iterations = 4,
): void {
  for (let iter = 0; iter < iterations; iter++) {
    for (const constraint of constraints.values()) {
      const bodyA = bodies.get(constraint.bodyA);
      const bodyB = bodies.get(constraint.bodyB);
      if (!bodyA || !bodyB) continue;

      switch (constraint.type) {
        case 'spring':
          solveSpring(bodyA, bodyB, constraint);
          break;
        case 'distance':
          solveDistance(bodyA, bodyB, constraint);
          break;
        case 'pin':
          solvePin(bodyA, bodyB, constraint);
          break;
        case 'hinge':
          // Hinge requires angular physics — not needed for board games
          break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Spring Constraint (Hooke's Law)
// ---------------------------------------------------------------------------

/**
 * F = -k × stretch - b × relativeVelocityAlongSpring
 */
function solveSpring(
  bodyA: PhysicsBody,
  bodyB: PhysicsBody,
  constraint: Constraint,
): void {
  const anchorA = V.add(bodyA.position, constraint.anchorA);
  const anchorB = V.add(bodyB.position, constraint.anchorB);

  const delta = V.sub(anchorB, anchorA);
  const dist = V.length(delta);
  if (dist < 1e-10) return;

  const direction = V.scale(delta, 1 / dist);
  const restLength = constraint.length ?? dist;
  const stretch = dist - restLength;

  // Relative velocity projected onto spring axis
  const relVel = V.sub(bodyB.velocity, bodyA.velocity);
  const relSpeed = V.dot(relVel, direction);

  // Hooke's law + velocity damping
  const forceMag =
    constraint.stiffness * stretch + constraint.damping * relSpeed;

  const force = V.scale(direction, forceMag);

  if (!bodyA.isStatic) {
    bodyA.acceleration.x += force.x * bodyA.invMass;
    bodyA.acceleration.y += force.y * bodyA.invMass;
  }
  if (!bodyB.isStatic) {
    bodyB.acceleration.x -= force.x * bodyB.invMass;
    bodyB.acceleration.y -= force.y * bodyB.invMass;
  }
}

// ---------------------------------------------------------------------------
// Distance Constraint (Rigid Rod)
// ---------------------------------------------------------------------------

/**
 * Position-based correction: push bodies along constraint axis
 * proportional to inverse mass.
 */
function solveDistance(
  bodyA: PhysicsBody,
  bodyB: PhysicsBody,
  constraint: Constraint,
): void {
  const anchorA = V.add(bodyA.position, constraint.anchorA);
  const anchorB = V.add(bodyB.position, constraint.anchorB);

  const delta = V.sub(anchorB, anchorA);
  const dist = V.length(delta);
  if (dist < 1e-10) return;

  const targetLength = constraint.length ?? 0;
  const error = dist - targetLength;
  const direction = V.scale(delta, 1 / dist);

  const totalInvMass = bodyA.invMass + bodyB.invMass;
  if (totalInvMass < 1e-10) return;

  const stiffness = constraint.stiffness;

  if (!bodyA.isStatic) {
    const correction = (error * bodyA.invMass * stiffness) / totalInvMass;
    bodyA.position.x += direction.x * correction;
    bodyA.position.y += direction.y * correction;
  }
  if (!bodyB.isStatic) {
    const correction = (error * bodyB.invMass * stiffness) / totalInvMass;
    bodyB.position.x -= direction.x * correction;
    bodyB.position.y -= direction.y * correction;
  }
}

// ---------------------------------------------------------------------------
// Pin Constraint
// ---------------------------------------------------------------------------

/**
 * Pin bodyA's anchor toward bodyB's anchor position.
 */
function solvePin(
  bodyA: PhysicsBody,
  bodyB: PhysicsBody,
  constraint: Constraint,
): void {
  const target: Vec2 = V.add(bodyB.position, constraint.anchorB);
  const anchor: Vec2 = V.add(bodyA.position, constraint.anchorA);

  const delta = V.sub(target, anchor);
  const correction = V.scale(delta, constraint.stiffness);

  if (!bodyA.isStatic) {
    V.addTo(bodyA.position, correction);
    bodyA.velocity.x += correction.x * constraint.damping;
    bodyA.velocity.y += correction.y * constraint.damping;
  }
}
