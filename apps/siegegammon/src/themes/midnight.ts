import type { Theme } from './index.js';

export const midnight: Theme = {
  name: 'Midnight',

  frame: { dark: '#0a1628', light: '#152238' },
  felt: { light: '#1a2332', dark: '#111a26' },
  points: { a: '#4a8ab5', b: '#8090a0' },

  player1: { face: '#e8eef5', highlight: '#c8d4e2', shadow: '#a0b0c4' },
  player2: { face: '#3a3e48', highlight: '#252830', shadow: '#14161a' },

  lockedGlow: { player1: '#40b0d0', player2: '#8060c0' },

  accent: { primary: '#4a8ab5', secondary: '#6abadf' },

  dice: { face: '#e0e8f0', faceAlt: '#c0c8d8', pips: '#0a1628' },
};
