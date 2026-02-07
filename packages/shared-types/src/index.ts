// Re-export all shared types

export type {
  AnimationSource,
  AnimationDescriptor,
  AnimationState,
  KeyframeSnapshot,
  AnimationTimeline,
  AnimationEventType,
  AnimationEvent,
  AnimationPerformance,
} from './animation.js';

export type {
  Vec2,
  BodyShape,
  PhysicsBody,
  ConstraintType,
  Constraint,
  ForceField,
  WorldConfig,
} from './physics.js';

export type {
  PlayerId,
  CheckerPosition,
  CheckerState,
  PointState,
  DiceRoll,
  DoublingCubeState,
  MoveType,
  Move,
  TurnPhase,
  GamePhase,
  WinType,
  GameState,
} from './game.js';

export type {
  WorldSnapshot,
  PageToDevToolsMessage,
  DevToolsToPageMessage,
} from './devtools.js';
