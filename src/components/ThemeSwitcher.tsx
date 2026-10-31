import { Palette } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { haptic } from '@/lib/telegram-api';
import type { ThemeId } from '@/lib/theme-types';

const THEMES: Array<{ id: ThemeId; label: string }> = [
  { id: 'neon', label: 'Неон' },
  { id: 'restaurant', label: 'Уют' },
  { id: 'cartoon', label: 'Мультик' },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switcher flex items-center gap-1.5 p-1.5 rounded-2xl mb-5" aria-label="Выбор темы оформления">
      <Palette className="theme-switcher-icon w-4 h-4 ml-1 flex-shrink-0" aria-hidden="true" />
      {THEMES.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            setTheme(item.id);
            haptic('select');
          }}
          aria-pressed={theme === item.id}
          className={`theme-option flex-1 px-2 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 ${theme === item.id ? 'is-active' : ''}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
