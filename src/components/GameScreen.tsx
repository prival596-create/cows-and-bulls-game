import { useEffect, useRef } from 'react';
import { ChevronLeft, Flag } from 'lucide-react';
import type { GuessResult } from '@/game/logic';
import NumberPad from './NumberPad';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { difficultyLabel, digitsLabel } from '@/game/difficulty';

interface GameScreenProps {
  digits: number;
  history: GuessResult[];
  slots: (string | null)[];
  cursor: number;
  error: string | null;
  onInput: (d: string) => void;
  onDelete: () => void;
  onSelectSlot: (index: number) => void;
  onSubmit: () => void;
  onExit: () => void;
  turnLabel: string;
  liveWidget?: React.ReactNode;
}

export default function GameScreen({
  digits,
  history,
  slots,
  cursor,
  error,
  onInput,
  onDelete,
  onSelectSlot,
  onSubmit,
  onExit,
  turnLabel,
  liveWidget,
}: GameScreenProps) {
  const submitDisabled = slots.some((digit) => digit === null);
  const historyRef = useRef<HTMLDivElement>(null);
  const prevHistoryLength = useRef(history.length);

  // Поддержка физической клавиатуры (Telegram Desktop / веб-версия)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        onInput(event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        onDelete();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (!submitDisabled) onSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onInput, onDelete, onSubmit, submitDisabled]);

  // Новые догадки всегда видны — прокручиваем список вниз
  useEffect(() => {
    const node = historyRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [history.length]);

  return (
    <div className="neon-shell app-screen flex flex-col max-w-md mx-auto px-5 pt-safe pb-safe">
      <ThemeSwitcher />
      <style>{`
        @keyframes resultPulse {
          0% { transform: scale(1); }
          40% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        .animate-result-pulse {
          animation: resultPulse 0.5s ease-out;
        }
      `}</style>
      <header className="flex items-center gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={onExit}
          className="p-2 -ml-2 rounded-xl neon-muted hover:bg-cyan-950/70 hover:text-cyan-200 active:scale-90 transition"
          aria-label="Выйти в меню"
        >
          <ChevronLeft className="w-6 h-6" aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h2 className="neon-title text-base font-bold leading-tight">
            {turnLabel}
          </h2>
          <p className="neon-muted text-xs">
            {digits} {digitsLabel(digits)} · {difficultyLabel(digits)}
          </p>
        </div>
        <span className="neon-panel px-3 py-1.5 rounded-xl text-xs neon-muted">
          Попыток: <span className="neon-accent font-bold">{history.length}</span>
        </span>
      </header>

      {liveWidget}

      <div className="flex items-center gap-4 mb-2 px-1 flex-shrink-0">
        <Legend className="legend-bull">
          <span className="font-bold">Б</span> Бык — на своём месте
        </Legend>
        <Legend className="legend-cow">
          <span className="font-bold">К</span> Корова — есть, но не там
        </Legend>
      </div>

      <div ref={historyRef} className="flex-1 min-h-0 -mx-1 px-1 overflow-y-auto overscroll-contain mb-2">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="w-14 h-14 rounded-2xl neon-panel flex items-center justify-center mb-3">
              <Flag className="w-7 h-7 text-cyan-300 drop-shadow-[0_0_8px_rgba(0,214,255,0.8)]" aria-hidden="true" />
            </div>
            <p className="neon-muted text-sm">
              Ваши догадки появятся здесь. Введите число и нажмите «Проверить».
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((row, idx) => {
              const isNew = idx === history.length - 1 && idx === prevHistoryLength.current;
              const isWin = row.bulls === digits;
              return (
                <HistoryRow
                  key={idx}
                  row={row}
                  index={history.length - idx}
                  digits={digits}
                  isNew={isNew}
                />
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 px-4 py-3 rounded-xl bg-rose-950/70 border border-rose-400/60 text-rose-200 text-sm font-medium text-center animate-in shadow-[0_0_18px_rgba(244,63,94,0.2)]"
        >
          {error}
        </div>
      )}

      <NumberPad
        slots={slots}
        cursor={cursor}
        onInput={onInput}
        onDelete={onDelete}
        onSelectSlot={onSelectSlot}
        onSubmit={onSubmit}
        submitDisabled={submitDisabled}
      />
    </div>
  );
}

function Legend({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${className}`}>
      {children}
    </div>
  );
}

function HistoryRow({ row, index, digits, isNew }: { row: GuessResult; index: number; digits: number; isNew: boolean }) {
  const isWin = row.bulls === digits;
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg transition ${isNew ? 'animate-result-pulse' : ''}
        ${
        isWin
          ? 'bg-lime-950/70 border border-lime-300/70 shadow-[0_0_16px_rgba(163,255,0,0.2)]'
          : 'neon-panel'
      }`}
    >
      <span className="neon-muted text-[10px] font-semibold w-5 text-center flex-shrink-0">
        {index}
      </span>
      <div className="flex gap-1 flex-1 min-w-0">
        {row.guess.split('').map((d, i) => (
          <span
            key={i}
            className={`flex-1 min-w-0 max-w-[2rem] h-7 rounded-md flex items-center justify-center text-sm font-bold ${
              isWin
                ? 'bg-gradient-to-br from-lime-300 to-emerald-600 text-slate-950 shadow-[0_0_10px_rgba(163,255,0,0.6)]'
                : 'bg-gradient-to-br from-blue-500 to-cyan-700 text-white shadow-[0_0_8px_rgba(0,214,255,0.45)]'
            }`}
          >
            {d}
          </span>
        ))}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <Badge count={row.bulls} type="bull" />
        <Badge count={row.cows} type="cow" />
      </div>
    </div>
  );
}

function Badge({ count, type }: { count: number; type: 'bull' | 'cow' }) {
  const styles = {
    bull: 'bg-rose-950/80 text-rose-200 border border-rose-400/50',
    cow: 'bg-yellow-950/80 text-yellow-200 border border-yellow-400/50',
  };
  return (
    <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded min-w-[2rem] justify-center ${styles[type]}`}>
      <span className="text-xs font-bold">{count}</span>
      <span className="text-[10px] font-semibold">{type === 'bull' ? 'Б' : 'К'}</span>
    </div>
  );
}
