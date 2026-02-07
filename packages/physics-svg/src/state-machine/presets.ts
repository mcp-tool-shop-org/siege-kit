import { StateMachine } from './machine.js';
import type { StateTransition } from './transitions.js';

// ---------------------------------------------------------------------------
// Pickup / Drop interaction
// ---------------------------------------------------------------------------

/** States for the pickup-drop interaction cycle. */
export type PickupDropState =
  | 'idle'
  | 'picked-up'
  | 'moving'
  | 'dropping'
  | 'bouncing'
  | 'settled';

/** Events for the pickup-drop interaction cycle. */
export type PickupDropEvent =
  | 'GRAB'
  | 'MOVE'
  | 'RELEASE'
  | 'BOUNCE_START'
  | 'BOUNCE_END'
  | 'SETTLE';

/**
 * Create a state machine for the common pick-up / drop interaction:
 *
 * idle -> picked-up -> moving -> dropping -> bouncing -> settled
 *
 * The machine can also go directly from dropping to settled if there is
 * no bounce.
 */
export function createPickupDropMachine(): StateMachine<
  PickupDropState,
  PickupDropEvent
> {
  const transitions: StateTransition<PickupDropState, PickupDropEvent>[] = [
    { from: 'idle', to: 'picked-up', on: 'GRAB' },
    { from: 'picked-up', to: 'moving', on: 'MOVE' },
    { from: 'moving', to: 'dropping', on: 'RELEASE' },
    { from: 'dropping', to: 'bouncing', on: 'BOUNCE_START' },
    { from: 'dropping', to: 'settled', on: 'SETTLE' },
    { from: 'bouncing', to: 'settled', on: 'BOUNCE_END' },
    // Allow re-grab from settled
    { from: 'settled', to: 'picked-up', on: 'GRAB' },
  ];

  return new StateMachine<PickupDropState, PickupDropEvent>(
    'idle',
    transitions,
  );
}

// ---------------------------------------------------------------------------
// Deploy interaction
// ---------------------------------------------------------------------------

/** States for the deploy interaction (e.g. placing a checker from reserve). */
export type DeployState =
  | 'reserve'
  | 'deploying'
  | 'landing'
  | 'settled';

/** Events for the deploy interaction. */
export type DeployEvent = 'DEPLOY' | 'LAND' | 'SETTLE';

/**
 * Create a state machine for the deploy interaction:
 *
 * reserve -> deploying -> landing -> settled
 */
export function createDeployMachine(): StateMachine<
  DeployState,
  DeployEvent
> {
  const transitions: StateTransition<DeployState, DeployEvent>[] = [
    { from: 'reserve', to: 'deploying', on: 'DEPLOY' },
    { from: 'deploying', to: 'landing', on: 'LAND' },
    { from: 'landing', to: 'settled', on: 'SETTLE' },
  ];

  return new StateMachine<DeployState, DeployEvent>('reserve', transitions);
}
