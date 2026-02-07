import type { Theme } from './index.js';

export const classic: Theme = {
  name: 'Classic',

  frame: { dark: '#3b1f0b', light: '#5c3317' },
  felt: { light: '#2d5a27', dark: '#1e3d1a' },
  points: { a: '#8b1a1a', b: '#c5a028' },

  player1: { face: '#faf5e8', highlight: '#e8dcc8', shadow: '#c9b896' },
  player2: { face: '#4a4a4a', highlight: '#2a2a2a', shadow: '#111111' },

  lockedGlow: { player1: '#c5a028', player2: '#a0a0b0' },

  accent: { primary: '#c5a028', secondary: '#e8c840' },

  dice: { face: '#f5f0e0', faceAlt: '#d9d0b8', pips: '#2a1508' },
};
