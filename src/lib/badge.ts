import { useEffect } from 'react';

/**
 * Плашка «Made in Bolt» добавляется хостингом/превью Bolt, а не кодом приложения.
 * На своём хостинге её нет вообще. Этот хук — страховка: убирает только известные
 * элементы плашки и не трогает остальную вёрстку.
 */
const BADGE_SELECTORS = [
  '#bolt-badge',
  '.bolt-badge',
  '.__boltBadge__',
  '[data-bolt-badge]',
  'a[href*="bolt.new"]',
  'iframe[src*="bolt.new"]',
].join(',');

function removeBadges(): void {
  document.querySelectorAll<HTMLElement>(BADGE_SELECTORS).forEach((node) => node.remove());
}

export function useHideBoltBadge(): void {
  useEffect(() => {
    removeBadges();

    const observer = new MutationObserver(removeBadges);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);
}
