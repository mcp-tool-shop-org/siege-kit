import { describe, it, expect } from 'vitest';

import {
  rollDice,
  createDiceRoll,
  getRemainingDice,
  useDie,
  allDiceUsed,
} from './dice.js';

describe('rollDice', () => {
  it('returns a valid DiceRoll structure', () => {
    const roll = rollDice();
    expect(roll.values).toHaveLength(2);
    expect(roll.values[0]).toBeGreaterThanOrEqual(1);
    expect(roll.values[0]).toBeLessThanOrEqual(6);
    expect(roll.values[1]).toBeGreaterThanOrEqual(1);
    expect(roll.values[1]).toBeLessThanOrEqual(6);
    expect(roll.movesUsed).toBe(0);
    expect(roll.usedValues).toEqual([]);
  });

  it('sets isDoubles correctly', () => {
    const roll = rollDice();
    expect(roll.isDoubles).toBe(roll.values[0] === roll.values[1]);
  });

  it('sets movesAvailable to 4 for doubles, 2 for non-doubles', () => {
    const roll = rollDice();
    if (roll.isDoubles) {
      expect(roll.movesAvailable).toBe(4);
    } else {
      expect(roll.movesAvailable).toBe(2);
    }
  });
});

describe('createDiceRoll', () => {
  it('creates deterministic non-doubles roll', () => {
    const roll = createDiceRoll(3, 5);
    expect(roll.values).toEqual([3, 5]);
    expect(roll.isDoubles).toBe(false);
    expect(roll.movesAvailable).toBe(2);
    expect(roll.movesUsed).toBe(0);
    expect(roll.usedValues).toEqual([]);
  });

  it('creates deterministic doubles roll', () => {
    const roll = createDiceRoll(4, 4);
    expect(roll.values).toEqual([4, 4]);
    expect(roll.isDoubles).toBe(true);
    expect(roll.movesAvailable).toBe(4);
    expect(roll.movesUsed).toBe(0);
    expect(roll.usedValues).toEqual([]);
  });

  it('detects doubles for all values 1-6', () => {
    for (let v = 1; v <= 6; v++) {
      const roll = createDiceRoll(v, v);
      expect(roll.isDoubles).toBe(true);
      expect(roll.movesAvailable).toBe(4);
    }
  });

  it('detects non-doubles for different values', () => {
    const roll = createDiceRoll(1, 6);
    expect(roll.isDoubles).toBe(false);
    expect(roll.movesAvailable).toBe(2);
  });
});

describe('getRemainingDice', () => {
  describe('non-doubles', () => {
    it('returns both values when none used', () => {
      const roll = createDiceRoll(3, 5);
      expect(getRemainingDice(roll)).toEqual([3, 5]);
    });

    it('returns one value when the other is used', () => {
      let roll = createDiceRoll(3, 5);
      roll = useDie(roll, 3);
      expect(getRemainingDice(roll)).toEqual([5]);
    });

    it('returns the first value when the second is used', () => {
      let roll = createDiceRoll(3, 5);
      roll = useDie(roll, 5);
      expect(getRemainingDice(roll)).toEqual([3]);
    });

    it('returns empty when both used', () => {
      let roll = createDiceRoll(3, 5);
      roll = useDie(roll, 3);
      roll = useDie(roll, 5);
      expect(getRemainingDice(roll)).toEqual([]);
    });
  });

  describe('doubles', () => {
    it('returns 4 values when none used', () => {
      const roll = createDiceRoll(4, 4);
      expect(getRemainingDice(roll)).toEqual([4, 4, 4, 4]);
    });

    it('returns 3 values when 1 used', () => {
      let roll = createDiceRoll(4, 4);
      roll = useDie(roll, 4);
      expect(getRemainingDice(roll)).toEqual([4, 4, 4]);
    });

    it('returns 2 values when 2 used', () => {
      let roll = createDiceRoll(4, 4);
      roll = useDie(roll, 4);
      roll = useDie(roll, 4);
      expect(getRemainingDice(roll)).toEqual([4, 4]);
    });

    it('returns 1 value when 3 used', () => {
      let roll = createDiceRoll(4, 4);
      roll = useDie(roll, 4);
      roll = useDie(roll, 4);
      roll = useDie(roll, 4);
      expect(getRemainingDice(roll)).toEqual([4]);
    });

    it('returns empty when all 4 used', () => {
      let roll = createDiceRoll(4, 4);
      roll = useDie(roll, 4);
      roll = useDie(roll, 4);
      roll = useDie(roll, 4);
      roll = useDie(roll, 4);
      expect(getRemainingDice(roll)).toEqual([]);
    });
  });
});

describe('useDie', () => {
  it('increments movesUsed', () => {
    const roll = createDiceRoll(2, 6);
    const after = useDie(roll, 2);
    expect(after.movesUsed).toBe(1);
  });

  it('appends to usedValues', () => {
    const roll = createDiceRoll(2, 6);
    const after = useDie(roll, 6);
    expect(after.usedValues).toEqual([6]);
  });

  it('does not mutate the original roll', () => {
    const roll = createDiceRoll(2, 6);
    useDie(roll, 2);
    expect(roll.movesUsed).toBe(0);
    expect(roll.usedValues).toEqual([]);
  });

  it('correctly chains multiple uses on non-doubles', () => {
    let roll = createDiceRoll(1, 3);
    roll = useDie(roll, 1);
    expect(roll.movesUsed).toBe(1);
    expect(roll.usedValues).toEqual([1]);

    roll = useDie(roll, 3);
    expect(roll.movesUsed).toBe(2);
    expect(roll.usedValues).toEqual([1, 3]);
  });

  it('correctly chains 4 uses on doubles', () => {
    let roll = createDiceRoll(6, 6);
    for (let i = 1; i <= 4; i++) {
      roll = useDie(roll, 6);
      expect(roll.movesUsed).toBe(i);
    }
    expect(roll.usedValues).toEqual([6, 6, 6, 6]);
  });

  it('throws when die value is not available', () => {
    const roll = createDiceRoll(2, 6);
    expect(() => useDie(roll, 4)).toThrow('Die value 4 is not available');
  });

  it('throws when die already used (non-doubles)', () => {
    let roll = createDiceRoll(2, 6);
    roll = useDie(roll, 2);
    expect(() => useDie(roll, 2)).toThrow('Die value 2 is not available');
  });

  it('throws when all 4 doubles consumed', () => {
    let roll = createDiceRoll(3, 3);
    roll = useDie(roll, 3);
    roll = useDie(roll, 3);
    roll = useDie(roll, 3);
    roll = useDie(roll, 3);
    expect(() => useDie(roll, 3)).toThrow('Die value 3 is not available');
  });
});

describe('allDiceUsed', () => {
  it('returns false for fresh non-doubles roll', () => {
    const roll = createDiceRoll(1, 5);
    expect(allDiceUsed(roll)).toBe(false);
  });

  it('returns false after using 1 of 2 non-doubles', () => {
    let roll = createDiceRoll(1, 5);
    roll = useDie(roll, 1);
    expect(allDiceUsed(roll)).toBe(false);
  });

  it('returns true after using both non-doubles', () => {
    let roll = createDiceRoll(1, 5);
    roll = useDie(roll, 1);
    roll = useDie(roll, 5);
    expect(allDiceUsed(roll)).toBe(true);
  });

  it('returns false for fresh doubles roll', () => {
    const roll = createDiceRoll(2, 2);
    expect(allDiceUsed(roll)).toBe(false);
  });

  it('returns false after using 3 of 4 doubles', () => {
    let roll = createDiceRoll(2, 2);
    roll = useDie(roll, 2);
    roll = useDie(roll, 2);
    roll = useDie(roll, 2);
    expect(allDiceUsed(roll)).toBe(false);
  });

  it('returns true after using all 4 doubles', () => {
    let roll = createDiceRoll(2, 2);
    roll = useDie(roll, 2);
    roll = useDie(roll, 2);
    roll = useDie(roll, 2);
    roll = useDie(roll, 2);
    expect(allDiceUsed(roll)).toBe(true);
  });
});
