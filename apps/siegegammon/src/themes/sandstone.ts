import type { Theme } from './index.js';

export const sandstone: Theme = {
  name: 'Sandstone',

  frame: { dark: '#3a2218', light: '#8b5e3c' },
  felt: { light: '#c4a87a', dark: '#a89068' },
  points: { a: '#b86830', b: '#7a5038' },

  player1: { face: '#f0e8d8', highlight: '#ddd0b8', shadow: '#c0b090' },
  player2: { face: '#5a2818', highlight: '#3e1c10', shadow: '#2a1008' },

  lockedGlow: { player1: '#d4a030', player2: '#b07040' },

  accent: { primary: '#c89048', secondary: '#e0a850' },

  dice: { face: '#e8dcc0', faceAlt: '#d0c0a0', pips: '#3a2218' },
};
