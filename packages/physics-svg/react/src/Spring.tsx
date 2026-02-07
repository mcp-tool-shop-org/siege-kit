import { useEffect, useRef } from 'react';
import type { Constraint, Vec2 } from '@mcp-tool-shop/siege-types';
import { createConstraint } from '../../src/core/constraint.js';
import { usePhysics } from './usePhysics.js';

/** Props for the {@link Spring} component. */
export interface SpringProps {
  /** ID of the first body. */
  bodyA: string;
  /** ID of the second body. */
  bodyB: string;
  /** Spring stiffness. Default 0.5. */
  stiffness?: number;
  /** Damping coefficient. Default 0.1. */
  damping?: number;
  /** Anchor point on body A (local coords). */
  anchorA?: Vec2;
  /** Anchor point on body B (local coords). */
  anchorB?: Vec2;
  /** Rest length. If omitted, computed from initial body positions. */
  length?: number;
}

/**
 * Spring — declarative React component that registers a spring constraint
 * between two bodies on mount and removes it on unmount.
 *
 * Renders nothing to the DOM.
 */
export function Spring(props: SpringProps) {
  const engine = usePhysics();
  const constraintRef = useRef<Constraint | null>(null);

  if (!constraintRef.current) {
    constraintRef.current = createConstraint({
      type: 'spring',
      bodyA: props.bodyA,
      bodyB: props.bodyB,
      stiffness: props.stiffness,
      damping: props.damping,
      anchorA: props.anchorA,
      anchorB: props.anchorB,
      length: props.length,
    });
  }

  useEffect(() => {
    const constraint = constraintRef.current!;
    engine.addConstraint(constraint);

    return () => {
      engine.removeConstraint(constraint.id);
    };
  }, [engine]);

  // This component renders nothing — constraints are drawn by the renderer
  return null;
}
