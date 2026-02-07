import { createContext } from 'react';
import type { PhysicsEngine } from '../../src/core/engine.js';

/**
 * React context that provides the {@link PhysicsEngine} instance to
 * descendant components and hooks.
 */
export const PhysicsContext = createContext<PhysicsEngine | null>(null);
