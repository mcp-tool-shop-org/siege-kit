import type { DiceRoll } from '@mcp-tool-shop/siege-types';

/**
 * Roll two dice randomly (1-6 each).
 * Doubles grant 4 moves instead of 2.
 */
export function rollDice(): DiceRoll {
  const v1 = Math.floor(Math.random() * 6) + 1;
  const v2 = Math.floor(Math.random() * 6) + 1;
  return createDiceRoll(v1, v2);
}

/**
 * Deterministic dice factory for testing.
 */
export function createDiceRoll(v1: number, v2: number): DiceRoll {
  const isDoubles = v1 === v2;
  return {
    values: [v1, v2],
    isDoubles,
    movesAvailable: isDoubles ? 4 : 2,
    movesUsed: 0,
    usedValues: [],
  };
}

/**
 * Returns an array of die values still available for use.
 *
 * Non-doubles [3,5] with usedValues=[3] -> [5]
 * Doubles [4,4] with movesUsed=1 -> [4,4,4]  (3 remaining)
 */
export function getRemainingDice(dice: DiceRoll): number[] {
  if (dice.isDoubles) {
    const remaining = dice.movesAvailable - dice.movesUsed;
    return Array(remaining).fill(dice.values[0]);
  }

  // Non-doubles: start with both values, remove used ones one-by-one
  const remaining = [...dice.values] as number[];
  for (const used of dice.usedValues) {
    const idx = remaining.indexOf(used);
    if (idx !== -1) {
      remaining.splice(idx, 1);
    }
  }
  return remaining;
}

/**
 * Returns a new DiceRoll with the given value consumed.
 * Throws if the value is not available in remaining dice.
 */
export function useDie(dice: DiceRoll, value: number): DiceRoll {
  const remaining = getRemainingDice(dice);
  const idx = remaining.indexOf(value);
  if (idx === -1) {
    throw new Error(
      `Die value ${value} is not available. Remaining: [${remaining.join(', ')}]`,
    );
  }

  return {
    ...dice,
    movesUsed: dice.movesUsed + 1,
    usedValues: [...dice.usedValues, value],
  };
}

/**
 * Returns true when all available moves have been used.
 */
export function allDiceUsed(dice: DiceRoll): boolean {
  return dice.movesUsed >= dice.movesAvailable;
}
