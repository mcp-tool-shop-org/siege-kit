import type {
  PhysicsBody,
  Constraint,
  ForceField,
  WorldConfig,
} from '@mcp-tool-shop/siege-types';
import { integrate, solveConstraints } from './solver.js';
import { applyGravity, applyDrag } from './forces.js';
import { detectCollisions, resolveCollision } from './collision.js';

/**
 * World — owns all simulation state (bodies, constraints, forces)
 * and orchestrates a single simulation step.
 */
export class World {
  readonly bodies: Map<string, PhysicsBody> = new Map();
  readonly constraints: Map<string, Constraint> = new Map();
  readonly forces: ForceField[] = [];
  readonly config: WorldConfig;

  constructor(config: WorldConfig) {
    this.config = config;
  }

  /**
   * Advance the world by `dt` seconds.
   *
   * Each step:
   * 1. Apply external forces (gravity, drag, …)
   * 2. Integrate positions (Verlet)
   * 3. Solve constraints
   * 4. Detect & resolve collisions
   */
  step(dt: number): void {
    const subDt = dt / this.config.substeps;

    for (let sub = 0; sub < this.config.substeps; sub++) {
      // 1. Forces
      for (const body of this.bodies.values()) {
        if (body.isStatic) continue;
        applyGravity(body, this.config.gravity);
        applyDrag(body, 0.01); // TODO: make configurable via ForceField
      }

      // 2. Integration
      for (const body of this.bodies.values()) {
        if (body.isStatic) continue;
        integrate(body, subDt);
      }

      // 3. Constraints
      solveConstraints(this.constraints, this.bodies);

      // 4. Collisions
      const bodiesArray = Array.from(this.bodies.values());
      const pairs = detectCollisions(bodiesArray);
      for (const pair of pairs) {
        const a = this.bodies.get(pair.bodyA);
        const b = this.bodies.get(pair.bodyB);
        if (a && b) {
          resolveCollision(a, b, pair.overlap);
        }
      }
    }
  }
}
