import { createContext, useContext, useState, ReactNode } from 'react';

interface ThemeModeContextType {
  mode: 'dark' | 'light';
  toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextType | null>(null);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('themeMode') as 'dark' | 'light') ?? 'dark'
  );

  const toggleMode = () => {
    setMode(m => {
      const next = m === 'dark' ? 'light' : 'dark';
      localStorage.setItem('themeMode', next);
      return next;
    });
  };

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used inside ThemeModeProvider');
  return ctx;
}
