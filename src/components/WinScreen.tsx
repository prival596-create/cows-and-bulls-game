import { Trophy, RefreshCw, Home, Share2 } from 'lucide-react';
import { haptic, shareText } from '@/lib/telegram-api';
import { pluralAttempts } from '@/game/format';

interface WinScreenProps {
  winnerName: string;
  secret: string;
  digits: number;
  attempts: number;
  onPlayAgain: () => void;
  onHome: () => void;
}

export default function WinScreen({
  winnerName,
  secret,
  digits,
  attempts,
  onPlayAgain,
  onHome,
}: WinScreenProps) {
  const handleShare = () => {
    haptic('tap');
    shareText(
      `🐂🐄 Я угадал секретное число из ${digits} цифр за ${attempts} ${pluralAttempts(attempts)} в игре «Быки и Коровы»! Попробуй и ты.`
    );
  };

  // Генерируем частицы фейерверка
  const particles = Array.from({ length: 50 }, (_, i) => {
    const angle = (i / 50) * 360;
    const distance = 160 + Math.random() * 100;
    const color = ['#5dffea', '#ff8a4c', '#fde047', '#ff8fa3', '#a78dbd'][Math.floor(Math.random() * 5)];
    const size = 8 + Math.random() * 8;
    const delay = Math.random() * 0.3;
    return { angle, distance, color, size, delay };
  });

  return (
    <div className="neon-shell app-screen flex flex-col items-center justify-center max-w-md mx-auto px-6 pt-safe pb-safe text-center relative overflow-hidden">
      {/* Keyframes для фейерверка */}
      <style>{`
        @keyframes firework {
          0% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--distance)) scale(0);
            opacity: 0;
          }
        }
        @keyframes resultPulse {
          0% { transform: scale(1); }
          30% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Фейерверк */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute top-1/4 left-1/2"
            style={{
              backgroundColor: p.color,
              boxShadow: `0 0 6px ${p.color}`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              animation: `firework 2s ease-out ${p.delay}s forwards`,
              '--angle': `${p.angle}deg`,
              '--distance': `${p.distance}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-2xl shadow-emerald-500/40 flex items-center justify-center mb-6 animate-bounce-slow relative z-10"
      >
        <Trophy className="w-12 h-12 text-white" fill="white" aria-hidden="true" />
      </div>

      <p className="neon-muted text-sm uppercase tracking-wide mb-1 relative z-10">
        Победа!
      </p>
      <h2 className="neon-title text-3xl font-black mb-6 relative z-10">{winnerName}</h2>

      <div className="neon-panel w-full rounded-2xl p-5 mb-6">
        <p className="neon-muted text-xs uppercase tracking-wide mb-2">
          Секретное число
        </p>
        <div className="flex justify-center gap-1.5 mb-5">
          {secret.split('').map((d, i) => (
            <span
              key={i}
              className="w-10 h-12 rounded-xl flex items-center justify-center text-2xl font-black text-white bg-gradient-to-br from-emerald-400 to-teal-600 animate-in"
            >
              {d}
            </span>
          ))}
        </div>

        <div className="flex justify-center gap-4">
          <Stat label="Попыток" value={attempts} highlight />
          <Stat label="Цифр" value={digits} />
        </div>
      </div>

      <div className="w-full space-y-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="neon-button w-full py-4 rounded-2xl font-bold text-lg shadow-emerald-500/40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" aria-hidden="true" />
          Играть снова
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="neon-button-secondary w-full py-3.5 rounded-2xl font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" aria-hidden="true" />
          Поделиться результатом
        </button>
        <button
          type="button"
          onClick={onHome}
          className="neon-button-secondary w-full py-3.5 rounded-2xl font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" aria-hidden="true" />
          В главное меню
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs neon-muted mb-1">{label}</span>
      <span className={`text-xl font-bold ${highlight ? 'neon-accent' : 'neon-muted'}`}>
        {value}
      </span>
    </div>
  );
}
