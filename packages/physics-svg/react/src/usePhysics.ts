import { useContext } from 'react';
import { PhysicsContext } from './context.js';
import type { PhysicsEngine } from '../../src/core/engine.js';

/**
 * Hook to access the nearest {@link PhysicsEngine} from context.
 *
 * Must be used inside a `<PhysicsScene>` provider.
 *
 * @throws If no PhysicsEngine is found in context.
 */
export function usePhysics(): PhysicsEngine {
  const engine = useContext(PhysicsContext);
  if (!engine) {
    throw new Error(
      'usePhysics() must be used inside a <PhysicsScene> component.',
    );
  }
  return engine;
}
