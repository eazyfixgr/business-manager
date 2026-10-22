import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'el';
export type FontScale = 'small' | 'medium' | 'large';

const STORAGE_KEY = 'bm:settings';

const FONT_SIZES: Record<FontScale, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

interface SettingsState {
  theme: Theme;
  language: Language;
  fontScale: FontScale;
}

interface SettingsContextValue extends SettingsState {
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setFontScale: (fontScale: FontScale) => void;
}

const DEFAULTS: SettingsState = {
  theme: 'system',
  language: 'el',
  fontScale: 'medium',
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return {
      theme: parsed.theme ?? DEFAULTS.theme,
      language: parsed.language ?? DEFAULTS.language,
      fontScale: parsed.fontScale ?? DEFAULTS.fontScale,
    };
  } catch {
    return DEFAULTS;
  }
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(loadSettings);
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore quota / privacy errors */
    }
  }, [settings]);

  const resolvedTheme: 'light' | 'dark' =
    settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZES[settings.fontScale];
  }, [settings.fontScale]);

  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  const setTheme = useCallback((theme: Theme) => {
    setSettings((s) => ({ ...s, theme }));
  }, []);

  const setLanguage = useCallback((language: Language) => {
    setSettings((s) => ({ ...s, language }));
  }, []);

  const setFontScale = useCallback((fontScale: FontScale) => {
    setSettings((s) => ({ ...s, fontScale }));
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      resolvedTheme,
      setTheme,
      setLanguage,
      setFontScale,
    }),
    [settings, resolvedTheme, setTheme, setLanguage, setFontScale],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}
