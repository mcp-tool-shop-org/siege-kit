import type { PhysicsBody, Vec2 } from '@mcp-tool-shop/siege-types';

/**
 * Describes a detected collision between two bodies.
 */
export interface CollisionPair {
  bodyA: string;
  bodyB: string;
  overlap: Vec2;
  normal: Vec2;
}

/**
 * Broad + narrow phase collision detection.
 *
 * TODO: Implement spatial hashing for broad phase.
 * TODO: Implement SAT / circle-circle narrow phase.
 *
 * @returns An array of collision pairs for this frame.
 */
export function detectCollisions(bodies: PhysicsBody[]): CollisionPair[] {
  const pairs: CollisionPair[] = [];

  // TODO: O(n^2) brute-force placeholder — replace with spatial hash grid
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];

      // TODO: implement actual shape-vs-shape intersection tests
      // For now, no collisions are reported.
      void a;
      void b;
    }
  }

  return pairs;
}

/**
 * Resolve a single collision by adjusting positions and velocities.
 *
 * TODO: Implement impulse-based collision response.
 */
export function resolveCollision(
  a: PhysicsBody,
  b: PhysicsBody,
  overlap: Vec2,
): void {
  // TODO: positional correction
  // TODO: impulse exchange based on restitution & mass
  void a;
  void b;
  void overlap;
}
