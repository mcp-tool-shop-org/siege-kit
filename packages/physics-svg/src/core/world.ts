import type {
  PhysicsBody,
  Constraint,
  ForceField,
  WorldConfig,
} from '@mcp-tool-shop/siege-types';
import { integrate, solveConstraints } from './solver.js';
import { applyGravity, applyDrag, applyForceFields } from './forces.js';
import { detectCollisions, resolveCollision } from './collision.js';
import { updateSleepState, wakeBody, wakeOnCollision } from './sleeping.js';

/**
 * World — owns all simulation state and orchestrates a single step.
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
   * Pipeline per substep:
   * 1. Apply forces (gravity, drag, custom force fields)
   * 2. Integrate positions (semi-implicit Euler)
   * 3. Solve constraints (spring, distance, pin)
   * 4. Detect & resolve collisions
   * 5. Enforce world bounds
   * 6. Update sleep states
   */
  step(dt: number): void {
    const subDt = dt / this.config.substeps;

    for (let sub = 0; sub < this.config.substeps; sub++) {
      // Wake bodies referenced by constraints
      for (const constraint of this.constraints.values()) {
        const a = this.bodies.get(constraint.bodyA);
        const b = this.bodies.get(constraint.bodyB);
        if (a && !a.isStatic && a.isSleeping) wakeBody(a);
        if (b && !b.isStatic && b.isSleeping) wakeBody(b);
      }

      // 1. Forces
      for (const body of this.bodies.values()) {
        if (body.isStatic || body.isSleeping) continue;
        applyGravity(body, this.config.gravity);
        applyDrag(body, 0.01);
        if (this.forces.length > 0) {
          applyForceFields(body, this.forces, this.config.gravity);
        }
      }

      // 2. Integration
      for (const body of this.bodies.values()) {
        if (body.isStatic || body.isSleeping) continue;
        integrate(body, subDt);
      }

      // 3. Constraints
      solveConstraints(
        this.constraints,
        this.bodies,
        this.config.velocityIterations,
      );

      // 4. Collisions
      const bodiesArray = Array.from(this.bodies.values());
      const pairs = detectCollisions(bodiesArray);

      for (const pair of pairs) {
        const a = this.bodies.get(pair.bodyA);
        const b = this.bodies.get(pair.bodyB);
        if (a && b) {
          wakeOnCollision(a, b);
          resolveCollision(a, b, pair);
        }
      }

      // 5. World bounds
      if (this.config.bounds) {
        this.enforceBounds();
      }

      // 6. Sleep
      for (const body of this.bodies.values()) {
        if (body.isStatic) continue;
        updateSleepState(body);
      }
    }
  }

  /** Clamp bodies within configured world bounds. */
  private enforceBounds(): void {
    const bounds = this.config.bounds;
    if (!bounds) return;

    for (const body of this.bodies.values()) {
      if (body.isStatic) continue;

      let radius = 0;
      if (body.shape.type === 'circle') {
        radius = body.shape.radius;
      } else if (body.shape.type === 'rect') {
        radius = Math.max(body.shape.width, body.shape.height) / 2;
      }

      if (body.position.x - radius < bounds.min.x) {
        body.position.x = bounds.min.x + radius;
        body.velocity.x = Math.abs(body.velocity.x) * body.restitution;
      }
      if (body.position.x + radius > bounds.max.x) {
        body.position.x = bounds.max.x - radius;
        body.velocity.x = -Math.abs(body.velocity.x) * body.restitution;
      }
      if (body.position.y - radius < bounds.min.y) {
        body.position.y = bounds.min.y + radius;
        body.velocity.y = Math.abs(body.velocity.y) * body.restitution;
      }
      if (body.position.y + radius > bounds.max.y) {
        body.position.y = bounds.max.y - radius;
        body.velocity.y = -Math.abs(body.velocity.y) * body.restitution;
      }
    }
  }

  /** Add a force field. */
  addForceField(field: ForceField): void {
    this.forces.push(field);
  }

  /** Remove all force fields of a given type. */
  removeForceFields(type: ForceField['type']): void {
    for (let i = this.forces.length - 1; i >= 0; i--) {
      if (this.forces[i]!.type === type) {
        this.forces.splice(i, 1);
      }
    }
  }
}
