import { useState } from 'react';
import { User, Play, ArrowRight, Trophy, Sparkles, Globe } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { haptic } from '@/lib/telegram-api';
import type { GameMode } from '@/game/logic';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { difficultyLabel, digitsLabel } from '@/game/difficulty';

interface HomeScreenProps {
  onStart: (digits: number, mode: GameMode) => void;
  onLeaderboard: () => void;
  onOnlineSetup: (digits: number) => void;
}

const DIFFICULTIES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function HomeScreen({ onStart, onLeaderboard, onOnlineSetup }: HomeScreenProps) {
  const { user } = useTelegram();
  const [digits, setDigits] = useState(4);
  const [mode, setMode] = useState<GameMode>('solo');
  const displayName = user?.username ? `@${user.username}` : user?.firstName ?? 'игрок';

  return (
    <div className="neon-shell app-screen flex flex-col max-w-md mx-auto px-6 pt-safe pb-safe overflow-y-auto overscroll-contain">
      <ThemeSwitcher />
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {user?.photoUrl ? (
            <img
              src={user.photoUrl}
              alt=""
              className="w-12 h-12 rounded-2xl object-cover shadow-[0_0_24px_rgba(24,235,218,0.45)]"
            />
          ) : (
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-300 via-cyan-500 to-orange-400 shadow-[0_0_24px_rgba(24,235,218,0.7)] flex items-center justify-center">
              <span className="text-lg font-black text-white drop-shadow">БК</span>
            </div>
          )}
          <div>
            <h1 className="neon-title text-lg font-black leading-tight">Быки и Коровы</h1>
            <p className="neon-muted text-xs">Привет, {displayName}!</p>
          </div>
        </div>
        <Sparkles className="w-6 h-6 text-orange-300 drop-shadow-[0_0_10px_rgba(255,138,76,0.9)]" aria-hidden="true" />
      </header>

      <button
        type="button"
        onClick={() => {
          haptic('tap');
          onLeaderboard();
        }}
        className="neon-panel flex items-center gap-3 w-full p-4 rounded-2xl on-panel active:scale-[0.98] transition-transform mb-6"
      >
        <Trophy className="w-6 h-6 flex-shrink-0 text-yellow-300 drop-shadow-[0_0_8px_rgba(255,213,65,0.9)]" aria-hidden="true" />
        <div className="flex-1 text-left">
          <p className="neon-orange font-bold text-sm">Рейтинг игроков</p>
          <p className="neon-muted text-xs">Лучшие отгадчики за всё время</p>
        </div>
        <ArrowRight className="w-5 h-5" aria-hidden="true" />
      </button>

      <section className="mb-7">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="neon-muted text-sm font-semibold uppercase tracking-wide">
            Сложность
          </h2>
          <span className="neon-accent text-xs sm:text-sm font-medium text-right">
            {digits} {digitsLabel(digits)} · {difficultyLabel(digits)}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {DIFFICULTIES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setDigits(n);
                haptic('select');
              }}
              aria-pressed={digits === n}
              aria-label={`${n} ${digitsLabel(n)}`}
              className={`h-10 rounded-xl text-sm font-bold transition-all duration-200 ${
                digits === n
                  ? 'bg-gradient-to-br from-cyan-300 to-blue-600 text-white shadow-[0_0_18px_rgba(0,214,255,0.8)] scale-105'
                  : 'neon-button-secondary hover:border-cyan-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="neon-muted text-sm font-semibold uppercase tracking-wide mb-3">
          Режим игры
        </h2>
        <div className="space-y-3">
          <ModeCard
            active={mode === 'solo'}
            onClick={() => {
              setMode('solo');
              haptic('select');
            }}
            icon={<User className="w-5 h-5" />}
            title="Одиночная игра"
            desc="Угадывайте число против компьютера. Ваш результат попадёт в рейтинг."
          />
          <ModeCard
            active={mode === 'online'}
            onClick={() => {
              setMode('online');
              haptic('select');
            }}
            icon={<Globe className="w-5 h-5" />}
            title="Играть с друзьями (Онлайн)"
            desc="Создайте комнату или присоединитесь по коду. Живой прогресс всех игроков и фанты в финале."
          />
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          haptic('tap');
          if (mode === 'online') onOnlineSetup(digits);
          else onStart(digits, mode);
        }}
        className="neon-button mt-auto flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform"
      >
        <Play className="w-5 h-5 fill-current" aria-hidden="true" />
        {mode === 'online' ? 'Создать комнату' : 'Начать игру'}
      </button>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
        active
          ? 'mode-card-active'
          : 'neon-panel hover:border-cyan-300/80'
      }`}
    >
      <div
        className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl ${
          active ? 'bg-gradient-to-br from-cyan-300 to-blue-600 text-white shadow-[0_0_13px_rgba(0,214,255,0.7)]' : 'bg-slate-900/70 text-cyan-200'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="on-panel font-semibold text-sm">{title}</p>
        <p className="neon-muted text-xs mt-0.5 leading-relaxed">{desc}</p>
      </div>
      {active && <ArrowRight className="w-4 h-4 neon-accent mt-1 flex-shrink-0" aria-hidden="true" />}
    </button>
  );
}
