import type {
  PhysicsBody,
  Constraint,
  WorldConfig,
} from '@mcp-tool-shop/siege-types';
import { World } from './world.js';

/**
 * PhysicsEngine — top-level facade for the physics-svg simulation.
 *
 * Wraps a {@link World} and exposes a clean imperative API for adding /
 * removing bodies and constraints, stepping the simulation, and querying state.
 */
export class PhysicsEngine {
  private world: World;

  constructor(config: WorldConfig) {
    this.world = new World(config);
  }

  /** Advance the simulation by `dt` seconds. */
  step(dt: number): void {
    this.world.step(dt);
  }

  /** Register a body and return its id. */
  addBody(body: PhysicsBody): string {
    this.world.bodies.set(body.id, body);
    return body.id;
  }

  /** Remove a body by id. */
  removeBody(id: string): void {
    this.world.bodies.delete(id);
  }

  /** Register a constraint and return its id. */
  addConstraint(constraint: Constraint): string {
    this.world.constraints.set(constraint.id, constraint);
    return constraint.id;
  }

  /** Remove a constraint by id. */
  removeConstraint(id: string): void {
    this.world.constraints.delete(id);
  }

  /** Look up a single body. */
  getBody(id: string): PhysicsBody | undefined {
    return this.world.bodies.get(id);
  }

  /** Return every body currently in the world. */
  getBodies(): PhysicsBody[] {
    return Array.from(this.world.bodies.values());
  }

  /** Return every constraint currently in the world. */
  getConstraints(): Constraint[] {
    return Array.from(this.world.constraints.values());
  }

  /** Access the underlying world config. */
  getConfig(): WorldConfig {
    return this.world.config;
  }
}
