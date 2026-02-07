import { classic } from './classic.js';
import { midnight } from './midnight.js';
import { sandstone } from './sandstone.js';

export interface ThemeColors {
  face: string;
  highlight: string;
  shadow: string;
}

export interface Theme {
  name: string;

  frame: { dark: string; light: string };
  felt: { light: string; dark: string };
  points: { a: string; b: string };

  player1: ThemeColors;
  player2: ThemeColors;

  lockedGlow: { player1: string; player2: string };

  accent: { primary: string; secondary: string };

  dice: { face: string; faceAlt: string; pips: string };
}

export type ThemeName = 'classic' | 'midnight' | 'sandstone';

export const themes: Record<ThemeName, Theme> = {
  classic,
  midnight,
  sandstone,
};

export { classic, midnight, sandstone };
