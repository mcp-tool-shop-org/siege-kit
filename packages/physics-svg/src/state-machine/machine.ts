import type { StateTransition } from './transitions.js';

/** Callback signature for transition listeners. */
export type TransitionCallback<TState extends string> = (
  from: TState,
  to: TState,
) => void;

/**
 * A generic finite state machine.
 *
 * @template TState - Union of valid state names.
 * @template TEvent - Union of valid event names.
 */
export class StateMachine<
  TState extends string = string,
  TEvent extends string = string,
> {
  private currentState: TState;
  private readonly transitions: StateTransition<TState, TEvent>[];
  private readonly listeners: TransitionCallback<TState>[] = [];

  constructor(
    initialState: TState,
    transitions: StateTransition<TState, TEvent>[],
  ) {
    this.currentState = initialState;
    this.transitions = transitions;
  }

  /** Send an event to the machine. If a valid transition matches, it fires. */
  send(event: TEvent): void {
    const match = this.transitions.find(
      (t) =>
        t.from === this.currentState &&
        t.on === event &&
        (t.guard ? t.guard() : true),
    );

    if (!match) return;

    const from = this.currentState;
    this.currentState = match.to;

    match.action?.();

    for (const listener of this.listeners) {
      listener(from, match.to);
    }
  }

  /** Get the current state. */
  getState(): TState {
    return this.currentState;
  }

  /** Register a callback invoked on every successful transition. */
  onTransition(callback: TransitionCallback<TState>): void {
    this.listeners.push(callback);
  }
}
