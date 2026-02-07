// ---------------------------------------------------------------------------
// @mcp-tool-shop/physics-svg — Public API
// ---------------------------------------------------------------------------

// Core
export { PhysicsEngine } from './core/engine.js';
export { createBody } from './core/body.js';
export { createConstraint } from './core/constraint.js';
export * as Vec2 from './core/vec2.js';

// Sleeping
export { wakeBody } from './core/sleeping.js';

// Forces
export {
  applyGravity,
  applyDrag,
  applyWind,
  applyAttraction,
  applyForceFields,
} from './core/forces.js';

// Collision (types only — detection/resolution is internal to World)
export type { CollisionPair } from './core/collision.js';

// Rendering
export { SvgRenderer } from './rendering/svg-renderer.js';
export { CanvasRenderer } from './rendering/canvas-renderer.js';
export type { Renderer } from './rendering/renderer.js';

// State machine
export { StateMachine } from './state-machine/machine.js';
export {
  createPickupDropMachine,
  createDeployMachine,
} from './state-machine/presets.js';
export type { StateTransition } from './state-machine/transitions.js';

// DevTools
export { installDevToolsHook } from './devtools/hook.js';
export type { PhysicsSvgDevToolsHook } from './devtools/hook.js';
export { AnimationEmitter } from './devtools/emitter.js';

// Re-export key types from siege-types for consumer convenience
export type {
  Vec2 as Vec2Type,
  BodyShape,
  PhysicsBody,
  ConstraintType,
  Constraint,
  ForceField,
  WorldConfig,
  AnimationEvent,
  AnimationTimeline,
  AnimationState,
} from '@mcp-tool-shop/siege-types';
