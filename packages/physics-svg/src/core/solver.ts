import type { PhysicsBody, Constraint } from '@mcp-tool-shop/siege-types';

/**
 * Semi-implicit Euler / Verlet integration step.
 *
 * Updates velocity from acceleration, then position from velocity.
 * Resets acceleration to zero after integration.
 *
 * TODO: Switch to full Verlet (position-based) integration for better
 * stability at large substep counts.
 */
export function integrate(body: PhysicsBody, dt: number): void {
  // Update velocity: v += a * dt
  body.velocity.x += body.acceleration.x * dt;
  body.velocity.y += body.acceleration.y * dt;

  // Update position: p += v * dt
  body.position.x += body.velocity.x * dt;
  body.position.y += body.velocity.y * dt;

  // Reset acceleration for next frame
  body.acceleration.x = 0;
  body.acceleration.y = 0;
}

/**
 * Iteratively solve all constraints.
 *
 * TODO: Implement spring constraint solver (Hooke's law).
 * TODO: Implement distance constraint (XPBD projection).
 * TODO: Implement pin / hinge constraints.
 */
export function solveConstraints(
  constraints: Map<string, Constraint>,
  bodies: Map<string, PhysicsBody>,
): void {
  for (const constraint of constraints.values()) {
    const bodyA = bodies.get(constraint.bodyA);
    const bodyB = bodies.get(constraint.bodyB);
    if (!bodyA || !bodyB) continue;

    switch (constraint.type) {
      case 'spring':
        // TODO: apply spring force (Hooke's law) between bodyA and bodyB
        break;
      case 'distance':
        // TODO: project bodies to satisfy distance constraint
        break;
      case 'pin':
        // TODO: lock bodyA's anchor to bodyB's anchor
        break;
      case 'hinge':
        // TODO: rotational constraint
        break;
    }
  }
}
