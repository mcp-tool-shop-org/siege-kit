// Physics types for the siege-kit engine

export interface Vec2 {
  x: number;
  y: number;
}

export type BodyShape =
  | { type: 'circle'; radius: number }
  | { type: 'rect'; width: number; height: number }
  | { type: 'polygon'; vertices: Vec2[] };

export interface PhysicsBody {
  id: string;
  position: Vec2;
  previousPosition: Vec2; // for render interpolation
  velocity: Vec2;
  acceleration: Vec2;
  mass: number;
  invMass: number; // cached 1/mass (0 for static)
  restitution: number; // 0-1
  friction: number;
  isStatic: boolean;
  isSleeping: boolean;
  sleepTimer: number; // frames below sleep threshold
  shape: BodyShape;
  userData?: Record<string, unknown>;
}

export type ConstraintType = 'spring' | 'distance' | 'pin' | 'hinge';

export interface Constraint {
  id: string;
  type: ConstraintType;
  bodyA: string;
  bodyB: string;
  anchorA: Vec2;
  anchorB: Vec2;
  stiffness: number;
  damping: number;
  length?: number;
}

export interface ForceField {
  type: 'gravity' | 'drag' | 'wind' | 'attraction';
  vector?: Vec2;
  strength?: number;
  falloff?: 'none' | 'linear' | 'quadratic';
}

export interface WorldConfig {
  gravity: Vec2;
  bounds?: { min: Vec2; max: Vec2 };
  substeps: number;
  velocityIterations: number;
}
