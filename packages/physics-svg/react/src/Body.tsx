import { useEffect, useRef } from 'react';
import type { PhysicsBody, BodyShape, Vec2 } from '@mcp-tool-shop/siege-types';
import { createBody } from '../../src/core/body.js';
import { usePhysics } from './usePhysics.js';

/** Props for the {@link Body} component. */
export interface BodyProps {
  /** Shape of the physics body. */
  shape?: BodyShape;
  /** Mass (kg). Default 1. */
  mass?: number;
  /** Initial position. */
  position?: Vec2;
  /** Initial velocity. */
  velocity?: Vec2;
  /** Coefficient of restitution (bounciness). 0-1. */
  restitution?: number;
  /** Friction coefficient. */
  friction?: number;
  /** If true, the body is immovable. */
  isStatic?: boolean;
  /** Arbitrary user data attached to the body. */
  userData?: Record<string, unknown>;
}

/**
 * Body — declarative React component that registers a physics body with
 * the engine on mount and removes it on unmount.
 *
 * Renders nothing to the DOM. Visual representation is handled entirely
 * by the {@link SvgRenderer}.
 */
export function Body(props: BodyProps) {
  const engine = usePhysics();
  const bodyRef = useRef<PhysicsBody | null>(null);

  if (!bodyRef.current) {
    bodyRef.current = createBody({
      shape: props.shape,
      mass: props.mass,
      position: props.position,
      velocity: props.velocity,
      restitution: props.restitution,
      friction: props.friction,
      isStatic: props.isStatic,
      userData: props.userData,
    });
  }

  useEffect(() => {
    const body = bodyRef.current!;
    engine.addBody(body);

    return () => {
      engine.removeBody(body.id);
    };
  }, [engine]);

  // This component renders nothing — the SvgRenderer handles visuals
  return null;
}
