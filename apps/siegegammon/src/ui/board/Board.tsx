import type { GameState, Move } from '@mcp-tool-shop/siege-types';
import type { Theme } from '../../themes/index.js';
import { BOARD } from '../boardGeometry.js';
import { BoardSurface } from './layers/BoardSurface.js';
import { CheckersLayer } from './layers/CheckersLayer.js';
import { MoveHighlights } from './layers/MoveHighlights.js';
import { ReserveAndSiege } from './layers/ReserveAndSiege.js';
import { DiceDisplay } from '../hud/DiceDisplay.js';

interface BoardProps {
  gameState: GameState;
  theme: Theme;
  selectedCheckerId: string | null;
  movesForSelected: Move[];
  onSelectChecker: (checkerId: string) => void;
  onClearSelection: () => void;
  onExecuteMove: (move: Move) => void;
}

const SVG_STYLE: React.CSSProperties = {
  width: '100%',
  height: '100%',
  userSelect: 'none',
  touchAction: 'none',
  flex: 1,
};

export function Board({
  gameState,
  theme,
  selectedCheckerId,
  movesForSelected,
  onSelectChecker,
  onClearSelection,
  onExecuteMove,
}: BoardProps) {
  return (
    <svg
      viewBox={BOARD.viewBox}
      style={SVG_STYLE}
      onPointerDown={(e) => {
        // Clear selection when clicking empty board space
        if (e.target === e.currentTarget) {
          onClearSelection();
        }
      }}
    >
      <BoardSurface theme={theme} />
      <CheckersLayer
        gameState={gameState}
        theme={theme}
        selectedCheckerId={selectedCheckerId}
        onSelectChecker={onSelectChecker}
      />
      <ReserveAndSiege
        gameState={gameState}
        theme={theme}
        selectedCheckerId={selectedCheckerId}
        onSelectChecker={onSelectChecker}
      />
      <MoveHighlights
        movesForSelected={movesForSelected}
        theme={theme}
        currentPlayer={gameState.currentPlayer}
        onExecuteMove={onExecuteMove}
      />
      <DiceDisplay dice={gameState.dice} theme={theme} />
    </svg>
  );
}
