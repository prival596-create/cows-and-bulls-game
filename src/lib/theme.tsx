import { useCallback, useState, type ReactNode } from 'react';
import { ThemeContext } from './theme-context';
import type { ThemeId } from './theme-types';

const STORAGE_KEY = 'bulls-and-cows:theme';
const THEMES: ThemeId[] = ['neon', 'restaurant', 'cartoon'];

function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (THEMES as string[]).includes(stored)) return stored as ThemeId;
  } catch {
    /* приватный режим / заблокированное хранилище */
  }
  return 'neon';
}

function persistTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* не критично — тема просто не запомнится */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readStoredTheme);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    persistTheme(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div data-game-theme={theme} className="min-h-full">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
