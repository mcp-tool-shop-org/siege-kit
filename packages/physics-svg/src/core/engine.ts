import type {
  PhysicsBody,
  Constraint,
  ForceField,
  WorldConfig,
  Vec2,
} from '@mcp-tool-shop/siege-types';
import { World } from './world.js';
import { wakeBody } from './sleeping.js';
import * as V from './vec2.js';

// ---------------------------------------------------------------------------
// Fixed Timestep Constants
// ---------------------------------------------------------------------------

/** Fixed physics timestep: 60 Hz → 16.667ms per step. */
const FIXED_DT = 1 / 60;
/** Maximum frame time to prevent spiral of death (250ms). */
const MAX_FRAME_TIME = 0.25;

// ---------------------------------------------------------------------------
// PhysicsEngine
// ---------------------------------------------------------------------------

/**
 * PhysicsEngine — top-level facade for the physics-svg simulation.
 *
 * Features:
 * - Fixed-timestep simulation with accumulator
 * - Interpolated body positions for smooth rendering
 * - Body and constraint management
 * - Force field system
 * - Sleep/wake management
 */
export class PhysicsEngine {
  private world: World;
  private accumulator = 0;
  private _alpha = 0; // interpolation factor for rendering

  constructor(config: WorldConfig) {
    this.world = new World(config);
  }

  // ---- Simulation ----------------------------------------------------------

  /**
   * Advance the simulation by `frameTime` seconds.
   *
   * Uses Glenn Fiedler's fixed-timestep-with-accumulator pattern:
   * - Clamp frame time to prevent spiral of death
   * - Step physics at fixed 60Hz intervals
   * - Store interpolation alpha for smooth rendering
   */
  update(frameTime: number): void {
    // Clamp to prevent spiral of death
    const clamped = Math.min(frameTime, MAX_FRAME_TIME);
    this.accumulator += clamped;

    while (this.accumulator >= FIXED_DT) {
      this.world.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    // Alpha for render interpolation (0 = previous state, 1 = current state)
    this._alpha = this.accumulator / FIXED_DT;
  }

  /**
   * Get the interpolation alpha for the current frame.
   *
   * Use this to blend between previousPosition and position:
   * renderPos = lerp(body.previousPosition, body.position, alpha)
   */
  get alpha(): number {
    return this._alpha;
  }

  /**
   * Get the interpolated render position for a body.
   */
  getInterpolatedPosition(body: PhysicsBody): Vec2 {
    return V.lerp(body.previousPosition, body.position, this._alpha);
  }

  // ---- Body Management -----------------------------------------------------

  /** Register a body and return its id. */
  addBody(body: PhysicsBody): string {
    this.world.bodies.set(body.id, body);
    return body.id;
  }

  /** Remove a body by id. */
  removeBody(id: string): void {
    this.world.bodies.delete(id);
  }

  /** Look up a single body. */
  getBody(id: string): PhysicsBody | undefined {
    return this.world.bodies.get(id);
  }

  /** Return every body currently in the world. */
  getBodies(): PhysicsBody[] {
    return Array.from(this.world.bodies.values());
  }

  /** Apply an instantaneous impulse to a body. */
  applyImpulse(id: string, impulse: Vec2): void {
    const body = this.world.bodies.get(id);
    if (!body || body.isStatic) return;
    wakeBody(body);
    body.velocity.x += impulse.x * body.invMass;
    body.velocity.y += impulse.y * body.invMass;
  }

  /** Set a body's position directly (teleport). */
  setPosition(id: string, position: Vec2): void {
    const body = this.world.bodies.get(id);
    if (!body) return;
    wakeBody(body);
    body.position.x = position.x;
    body.position.y = position.y;
    body.previousPosition.x = position.x;
    body.previousPosition.y = position.y;
  }

  /** Set a body's velocity directly. */
  setVelocity(id: string, velocity: Vec2): void {
    const body = this.world.bodies.get(id);
    if (!body || body.isStatic) return;
    wakeBody(body);
    body.velocity.x = velocity.x;
    body.velocity.y = velocity.y;
  }

  // ---- Constraint Management -----------------------------------------------

  /** Register a constraint and return its id. */
  addConstraint(constraint: Constraint): string {
    this.world.constraints.set(constraint.id, constraint);
    return constraint.id;
  }

  /** Remove a constraint by id. */
  removeConstraint(id: string): void {
    this.world.constraints.delete(id);
  }

  /** Return every constraint currently in the world. */
  getConstraints(): Constraint[] {
    return Array.from(this.world.constraints.values());
  }

  // ---- Force Fields --------------------------------------------------------

  /** Add a force field to the world. */
  addForceField(field: ForceField): void {
    this.world.addForceField(field);
  }

  /** Remove all force fields of a given type. */
  removeForceFields(type: ForceField['type']): void {
    this.world.removeForceFields(type);
  }

  // ---- Config --------------------------------------------------------------

  /** Access the underlying world config. */
  getConfig(): WorldConfig {
    return this.world.config;
  }
}
