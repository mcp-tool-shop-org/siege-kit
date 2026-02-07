// DevTools protocol message types

import type { AnimationEvent, AnimationPerformance, AnimationTimeline } from './animation.js';
import type { Constraint, PhysicsBody } from './physics.js';

export interface WorldSnapshot {
  bodies: PhysicsBody[];
  constraints: Constraint[];
  timestamp: number;
}

export type PageToDevToolsMessage =
  | { type: 'ANIMATION_EVENT'; payload: AnimationEvent }
  | { type: 'PERFORMANCE_UPDATE'; payload: AnimationPerformance }
  | { type: 'ANIMATIONS_SNAPSHOT'; payload: AnimationTimeline[] }
  | { type: 'PHYSICS_WORLD_SNAPSHOT'; payload: WorldSnapshot };

export type DevToolsToPageMessage =
  | { type: 'PAUSE_ANIMATION'; animationId: string }
  | { type: 'RESUME_ANIMATION'; animationId: string }
  | { type: 'SEEK_ANIMATION'; animationId: string; time: number }
  | { type: 'SET_PLAYBACK_RATE'; animationId: string; rate: number }
  | { type: 'UPDATE_EASING'; animationId: string; easing: string }
  | { type: 'REQUEST_SNAPSHOT' }
  | { type: 'ENABLE_PROFILING'; enabled: boolean };
