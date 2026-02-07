import { useEffect, useRef } from 'react';
import type { PhysicsBody } from '@mcp-tool-shop/siege-types';
import { createBody } from '../../src/core/body.js';
import { usePhysics } from './usePhysics.js';

/**
 * Hook to create and manage a physics body imperatively.
 *
 * The body is added to the engine on mount and removed on unmount.
 *
 * @param config - Partial body configuration.
 * @returns The created {@link PhysicsBody} (stable reference).
 */
export function useBody(config: Partial<PhysicsBody>): PhysicsBody {
  const engine = usePhysics();
  const bodyRef = useRef<PhysicsBody | null>(null);

  if (!bodyRef.current) {
    bodyRef.current = createBody(config);
  }

  useEffect(() => {
    const body = bodyRef.current!;
    engine.addBody(body);

    return () => {
      engine.removeBody(body.id);
    };
  }, [engine]);

  return bodyRef.current;
}
