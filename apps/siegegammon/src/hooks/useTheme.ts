import { useState } from 'react';
import { themes, type Theme, type ThemeName } from '../themes/index.js';

export function useTheme(initial: ThemeName = 'classic') {
  const [themeName, setTheme] = useState<ThemeName>(initial);
  const theme: Theme = themes[themeName];

  return { theme, themeName, setTheme } as const;
}
