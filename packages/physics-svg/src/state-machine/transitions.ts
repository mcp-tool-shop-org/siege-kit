/**
 * A single state transition definition.
 *
 * @template TState - Union of state names.
 * @template TEvent - Union of event names.
 */
export interface StateTransition<
  TState extends string = string,
  TEvent extends string = string,
> {
  /** The state this transition originates from. */
  from: TState;
  /** The state this transition leads to. */
  to: TState;
  /** The event that triggers this transition. */
  on: TEvent;
  /** Optional guard — transition only fires if this returns true. */
  guard?: () => boolean;
  /** Optional side-effect executed when the transition fires. */
  action?: () => void;
}
