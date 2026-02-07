import type { GameState, PlayerId } from '@mcp-tool-shop/siege-types';
import type { Theme } from '../../themes/index.js';

interface GameStatusProps {
  gameState: GameState;
  theme: Theme;
}

const CONTAINER_STYLE: React.CSSProperties = {
  textAlign: 'center',
  fontFamily: 'sans-serif',
  fontSize: 14,
  color: '#ccc',
  padding: '6px 0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

function playerLabel(player: PlayerId): string {
  return player === 'player1' ? 'Player 1' : 'Player 2';
}

function PlayerDot({ player, theme }: { player: PlayerId; theme: Theme }) {
  const color = player === 'player1' ? theme.player1.face : theme.player2.face;
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
        border: '1px solid #666',
        verticalAlign: 'middle',
      }}
    />
  );
}

function winTypeLabel(wt: string): string {
  switch (wt) {
    case 'standard':
      return 'Standard';
    case 'siege':
      return 'Siege';
    case 'total-siege':
      return 'Total Siege';
    default:
      return wt;
  }
}

export function GameStatus({ gameState, theme }: GameStatusProps) {
  const { gamePhase, turnPhase, currentPlayer, dice, doublingCube, winner, winType } =
    gameState;

  // Setup
  if (gamePhase === 'setup') {
    return <div style={CONTAINER_STYLE}>Roll to see who goes first</div>;
  }

  // Finished
  if (gamePhase === 'finished' && winner) {
    const scoreValue = doublingCube.value;
    return (
      <div style={CONTAINER_STYLE}>
        <PlayerDot player={winner} theme={theme} />
        <span>
          {playerLabel(winner)} wins! ({winTypeLabel(winType ?? 'standard')}) — Score: {scoreValue}
        </span>
      </div>
    );
  }

  // Doubling offered
  if (doublingCube.isOffered) {
    const opponent: PlayerId = currentPlayer === 'player1' ? 'player2' : 'player1';
    return (
      <div style={CONTAINER_STYLE}>
        <PlayerDot player={opponent} theme={theme} />
        <span>
          Double offered to {playerLabel(opponent)} — accept or decline?
        </span>
      </div>
    );
  }

  // Pre-roll
  if (turnPhase === 'pre-roll') {
    return (
      <div style={CONTAINER_STYLE}>
        <PlayerDot player={currentPlayer} theme={theme} />
        <span>{playerLabel(currentPlayer)}&apos;s turn — roll dice</span>
      </div>
    );
  }

  // Moving
  if (turnPhase === 'moving' && dice) {
    const remaining = dice.movesAvailable - dice.movesUsed;
    return (
      <div style={CONTAINER_STYLE}>
        <PlayerDot player={currentPlayer} theme={theme} />
        <span>
          {playerLabel(currentPlayer)} moving — {remaining} dice remaining
        </span>
      </div>
    );
  }

  // Rolling (transient state)
  if (turnPhase === 'rolling') {
    return (
      <div style={CONTAINER_STYLE}>
        <PlayerDot player={currentPlayer} theme={theme} />
        <span>{playerLabel(currentPlayer)} rolling...</span>
      </div>
    );
  }

  return null;
}
