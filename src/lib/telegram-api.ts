import { useEffect, useRef } from 'react';

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

export interface TelegramTheme {
  backgroundColor: string;
  textColor: string;
  hintColor: string;
  buttonColor: string;
  buttonTextColor: string;
  linkColor: string;
  sectionBackgroundColor: string;
  secondaryBackgroundColor: string;
  isDark: boolean;
}

type HapticImpact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
export type HapticNotification = 'error' | 'success' | 'warning';
export type HapticKind = 'tap' | 'select' | HapticNotification;

interface TelegramBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
}

export interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: { user?: { id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string } };
  themeParams?: Record<string, string | undefined>;
  colorScheme?: 'light' | 'dark';
  viewportHeight?: number;
  viewportStableHeight?: number;
  platform?: string;
  version?: string;
  CloudStorage?: {
    getItem: (key: string, callback: (error: Error | null, value?: string) => void) => void;
    setItem: (key: string, value: string, callback?: (error: Error | null) => void) => void;
  };
  HapticFeedback?: {
    impactOccurred: (style: HapticImpact) => void;
    notificationOccurred: (type: HapticNotification) => void;
    selectionChanged: () => void;
  };
  BackButton?: TelegramBackButton;
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  onEvent?: (event: string, callback: () => void) => void;
  offEvent?: (event: string, callback: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export function getWebApp(): TelegramWebApp | undefined {
  return typeof window === 'undefined' ? undefined : window.Telegram?.WebApp;
}

/** Тактильный отклик. В обычном браузере просто ничего не делает. */
export function haptic(kind: HapticKind): void {
  const feedback = getWebApp()?.HapticFeedback;
  if (!feedback) return;
  try {
    if (kind === 'tap') feedback.impactOccurred('light');
    else if (kind === 'select') feedback.selectionChanged();
    else feedback.notificationOccurred(kind);
  } catch {
    /* старые версии Telegram не поддерживают часть методов */
  }
}

/** Ссылка на само приложение — для приглашений в комнату и «поделиться».
 *  В Telegram лучше указать ссылку на мини-апп в VITE_TELEGRAM_APP_LINK,
 *  иначе поделимся обычным URL сайта. */
export function getAppUrl(): string {
  if (typeof window === 'undefined') return '';
  const configured = import.meta.env.VITE_TELEGRAM_APP_LINK;
  if (configured) return configured;
  return window.location.origin + window.location.pathname;
}

/** Нативное «Поделиться» Telegram с фолбэком на веб-версию. */
export function shareText(text: string, url = getAppUrl()): void {
  const webApp = getWebApp();
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(shareUrl);
    return;
  }
  if (webApp?.openLink) {
    webApp.openLink(shareUrl);
    return;
  }
  window.open(shareUrl, '_blank', 'noopener,noreferrer');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Telegram WebView на iOS иногда запрещает clipboard API */
  }

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Кнопка «Назад» в шапке Telegram — показывается только на внутренних экранах. */
export function useTelegramBackButton(visible: boolean, onBack: () => void): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    const backButton = getWebApp()?.BackButton;
    if (!backButton) return;

    const handler = () => onBackRef.current();

    if (!visible) {
      backButton.hide();
      return;
    }

    backButton.onClick(handler);
    backButton.show();
    return () => {
      backButton.offClick(handler);
      backButton.hide();
    };
  }, [visible]);
}
