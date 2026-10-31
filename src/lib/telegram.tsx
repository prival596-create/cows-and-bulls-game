import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getWebApp, type TelegramTheme, type TelegramUser, type TelegramWebApp } from './telegram-api';

export type { TelegramTheme, TelegramUser } from './telegram-api';

interface TelegramContextValue {
  ready: boolean;
  user: TelegramUser | null;
  theme: TelegramTheme | null;
  isTelegram: boolean;
}

const TelegramContext = createContext<TelegramContextValue | undefined>(undefined);

const FALLBACK_THEME: TelegramTheme = {
  backgroundColor: '#12051f',
  textColor: '#f8f4ff',
  hintColor: '#a99ab9',
  buttonColor: '#12d8cf',
  buttonTextColor: '#07111f',
  linkColor: '#ff9b4a',
  sectionBackgroundColor: '#24103b',
  secondaryBackgroundColor: '#32164f',
  isDark: true,
};

function readTheme(webApp: TelegramWebApp): TelegramTheme {
  const params = webApp.themeParams ?? {};
  const backgroundColor = params.bg_color ?? FALLBACK_THEME.backgroundColor;
  return {
    backgroundColor,
    textColor: params.text_color ?? FALLBACK_THEME.textColor,
    hintColor: params.hint_color ?? FALLBACK_THEME.hintColor,
    buttonColor: params.button_color ?? FALLBACK_THEME.buttonColor,
    buttonTextColor: params.button_text_color ?? FALLBACK_THEME.buttonTextColor,
    linkColor: params.link_color ?? FALLBACK_THEME.linkColor,
    sectionBackgroundColor: params.section_bg_color ?? FALLBACK_THEME.sectionBackgroundColor,
    secondaryBackgroundColor: params.secondary_bg_color ?? FALLBACK_THEME.secondaryBackgroundColor,
    isDark: webApp.colorScheme === 'dark' || isColorDark(backgroundColor),
  };
}

function applyThemeToCssVars(theme: TelegramTheme): void {
  const root = document.documentElement;
  root.style.setProperty('--tg-bg', theme.backgroundColor);
  root.style.setProperty('--tg-text', theme.textColor);
  root.style.setProperty('--tg-hint', theme.hintColor);
  root.style.setProperty('--tg-button', theme.buttonColor);
  root.style.setProperty('--tg-button-text', theme.buttonTextColor);
  root.style.setProperty('--tg-link', theme.linkColor);
  root.style.setProperty('--tg-section-bg', theme.sectionBackgroundColor);
  root.style.setProperty('--tg-secondary-bg', theme.secondaryBackgroundColor);
  root.dataset.tgTheme = theme.isDark ? 'dark' : 'light';

  const webApp = getWebApp();
  try {
    webApp?.setBackgroundColor?.(theme.backgroundColor);
    webApp?.setHeaderColor?.(theme.backgroundColor);
  } catch {
    /* не все клиенты поддерживают эти методы */
  }
}

function readUser(webApp: TelegramWebApp): TelegramUser | null {
  const user = webApp.initDataUnsafe?.user;
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.first_name ?? '',
    lastName: user.last_name,
    username: user.username,
    photoUrl: user.photo_url,
  };
}

function isColorDark(hex: string): boolean {
  const value = hex.replace('#', '');
  if (value.length !== 6) return true;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 < 150;
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [theme, setTheme] = useState<TelegramTheme>(FALLBACK_THEME);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const webApp = getWebApp();
    if (!webApp) {
      applyThemeToCssVars(FALLBACK_THEME);
      setReady(true);
      return;
    }

    webApp.ready();
    webApp.expand();
    // Не даём случайно свернуть мини-апп вертикальным свайпом во время игры
    webApp.disableVerticalSwipes?.();

    const nextTheme = readTheme(webApp);
    applyThemeToCssVars(nextTheme);
    setTheme(nextTheme);
    setUser(readUser(webApp));
    setIsTelegram(true);
    setReady(true);

    const handleThemeChange = () => {
      const updated = readTheme(webApp);
      applyThemeToCssVars(updated);
      setTheme(updated);
    };
    const handleViewportChange = () => {
      if (webApp.viewportStableHeight) {
        document.documentElement.style.setProperty('--tg-viewport-height', `${webApp.viewportStableHeight}px`);
      }
    };

    webApp.onEvent?.('themeChanged', handleThemeChange);
    webApp.onEvent?.('viewportChanged', handleViewportChange);
    handleViewportChange();

    return () => {
      webApp.offEvent?.('themeChanged', handleThemeChange);
      webApp.offEvent?.('viewportChanged', handleViewportChange);
    };
  }, []);

  return (
    <TelegramContext.Provider value={{ ready, user, theme, isTelegram }}>
      {children}
    </TelegramContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) throw new Error('useTelegram must be used within TelegramProvider');
  return context;
}
