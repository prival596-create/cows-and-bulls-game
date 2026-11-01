import { useState } from 'react';
import { User, Play, ArrowRight, Trophy, Sparkles, Globe, HelpCircle, Zap, Brain } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { haptic } from '@/lib/telegram-api';
import type { GameMode } from '@/game/logic';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { difficultyLabel, digitsLabel } from '@/game/difficulty';

interface HomeScreenProps {
  onStart: (digits: number, mode: GameMode) => void;
  onLeaderboard: () => void;
  onOnlineSetup: (digits: number, onlineMode: 'speed' | 'smart') => void;
}

type OnlineMode = 'speed' | 'smart';

const DIFFICULTIES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const RULES = [
  'Введите выбранные цифры — все должны быть уникальными',
  'Нажмите «Проверить»',
  '🐂 Бык — цифра на своём месте',
  '🐄 Корова — цифра есть, но не там',
  'Цель — отгадать все цифры за минимум попыток',
];

export default function HomeScreen({ onStart, onLeaderboard, onOnlineSetup }: HomeScreenProps) {
  const { user } = useTelegram();
  const [digits, setDigits] = useState(4);
  const [mode, setMode] = useState<GameMode>('solo');
  const [onlineMode, setOnlineMode] = useState<OnlineMode>('speed');
  const [showRules, setShowRules] = useState(false);
  const displayName = user?.username ? `@${user.username}` : user?.firstName ?? 'игрок';

  const handleStart = () => {
    haptic('tap');
    if (mode === 'online') {
      onOnlineSetup(digits, onlineMode);
    } else {
      onStart(digits, mode);
    }
  };

  return (
    <div className="neon-shell app-screen flex flex-col max-w-md mx-auto px-6 pt-safe pb-safe overflow-y-auto overscroll-contain">
      <ThemeSwitcher />
      
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              haptic('tap');
              setShowRules(true);
            }}
            className="p-2 rounded-xl neon-muted hover:bg-cyan-950/70 hover:text-cyan-200 active:scale-90 transition"
            aria-label="Правила игры"
          >
            <HelpCircle className="w-5 h-5" aria-hidden="true" />
          </button>
          <Sparkles className="w-6 h-6 text-orange-300 drop-shadow-[0_0_10px_rgba(255,138,76,0.9)]" aria-hidden="true" />
        </div>
      </header>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 animate-in">
          <div className="neon-panel rounded-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="neon-title text-lg font-bold">Правила игры</h3>
              <button
                type="button"
                onClick={() => {
                  haptic('tap');
                  setShowRules(false);
                }}
                className="p-1 rounded-lg neon-muted hover:text-cyan-200"
                aria-label="Закрыть"
              >
                <span className="text-xl">×</span>
              </button>
            </div>
            <div className="space-y-3 mb-4">
              {RULES.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-900/70 text-cyan-200 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="neon-muted text-sm leading-snug">
                    {rule}
                  </p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                haptic('tap');
                setShowRules(false);
              }}
              className="neon-button w-full py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-transform"
            >
              Понятно!
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard Button */}
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

      {/* Difficulty */}
      <section className="mb-6">
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

      {/* Start Button - moved above game mode */}
      <button
        type="button"
        onClick={handleStart}
        className="neon-button flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform mb-6"
      >
        <Play className="w-5 h-5 fill-current" aria-hidden="true" />
        {mode === 'online' ? 'Создать комнату' : 'Начать игру'}
      </button>

      {/* Game Mode */}
      <section className="mb-6">
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

        {/* Online Mode Selection */}
        {mode === 'online' && (
          <div className="mt-4 neon-panel rounded-2xl p-4">
            <h3 className="neon-accent text-sm font-bold mb-3">Режим онлайн-игры</h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setOnlineMode('speed');
                  haptic('select');
                }}
                aria-pressed={onlineMode === 'speed'}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                  onlineMode === 'speed' ? 'mode-card-active' : 'neon-panel hover:border-cyan-300/80'
                }`}
              >
                <div className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl ${
                  onlineMode === 'speed'
                    ? 'bg-gradient-to-br from-cyan-300 to-blue-600 text-white shadow-[0_0_13px_rgba(0,214,255,0.7)]'
                    : 'bg-slate-900/70 text-cyan-200'
                }`}>
                  <Zap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="on-panel font-semibold text-sm">На скорость ⚡</p>
                  <p className="neon-muted text-xs mt-0.5 leading-relaxed">
                    Победитель — тот, кто отгадал первым. Количество попыток не важно.
                  </p>
                </div>
                {onlineMode === 'speed' && <ArrowRight className="w-4 h-4 neon-accent mt-1 flex-shrink-0" aria-hidden="true" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOnlineMode('smart');
                  haptic('select');
                }}
                aria-pressed={onlineMode === 'smart'}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                  onlineMode === 'smart' ? 'mode-card-active' : 'neon-panel hover:border-cyan-300/80'
                }`}
              >
                <div className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl ${
                  onlineMode === 'smart'
                    ? 'bg-gradient-to-br from-purple-300 to-indigo-600 text-white shadow-[0_0_13px_rgba(168,85,247,0.7)]'
                    : 'bg-slate-900/70 text-cyan-200'
                }`}>
                  <Brain className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="on-panel font-semibold text-sm">На ум 🧠</p>
                  <p className="neon-muted text-xs mt-0.5 leading-relaxed">
                    Победитель — тот, кто отгадал за меньшее количество попыток. Скорость не важна.
                  </p>
                </div>
                {onlineMode === 'smart' && <ArrowRight className="w-4 h-4 neon-accent mt-1 flex-shrink-0" aria-hidden="true" />}
              </button>
            </div>
          </div>
        )}
      </section>
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
