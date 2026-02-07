// SiegeGammon game types

export type PlayerId = 'player1' | 'player2';

export type CheckerPosition =
  | { zone: 'reserve' }
  | { zone: 'board'; point: number } // 1-24
  | { zone: 'locked' };

export interface CheckerState {
  id: string;
  owner: PlayerId;
  position: CheckerPosition;
  isLocked: boolean;
}

export interface PointState {
  index: number; // 1-24
  checkers: CheckerState[];
}

export interface DiceRoll {
  values: [number, number];
  isDoubles: boolean;
  movesAvailable: number; // 2 or 4
  movesUsed: number;
}

export interface DoublingCubeState {
  value: number; // 1, 2, 4, 8, 16, 32, 64
  owner: PlayerId | 'center';
  isOffered: boolean;
}

export type MoveType = 'deploy' | 'advance';

export interface Move {
  type: MoveType;
  checkerId: string;
  from: CheckerPosition;
  to: CheckerPosition;
  dieValue: number;
  hits?: string; // checker ID
}

export type TurnPhase = 'pre-roll' | 'rolling' | 'moving' | 'turn-end';

export type GamePhase = 'setup' | 'playing' | 'finished';

export type WinType = 'standard' | 'siege' | 'total-siege';

export interface GameState {
  board: PointState[]; // 24
  reserves: Record<PlayerId, CheckerState[]>;
  locked: Record<PlayerId, CheckerState[]>;
  currentPlayer: PlayerId;
  dice: DiceRoll | null;
  doublingCube: DoublingCubeState;
  turnPhase: TurnPhase;
  gamePhase: GamePhase;
  winner: PlayerId | null;
  winType: WinType | null;
}
