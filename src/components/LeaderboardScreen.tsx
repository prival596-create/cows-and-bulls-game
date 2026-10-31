import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Trophy, Medal, Loader2, Crown, RefreshCw } from 'lucide-react';
import { getGlobalLeaderboard, type GlobalScore } from '@/lib/leaderboard';
import { haptic } from '@/lib/telegram-api';

interface LeaderboardScreenProps {
  onBack: () => void;
}

export default function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const [entries, setEntries] = useState<GlobalScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const result = await getGlobalLeaderboard(10);
    setEntries(result.entries);
    setError(result.error);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getGlobalLeaderboard(10);
      if (cancelled) return;
      setEntries(result.entries);
      setError(result.error);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRefresh = () => {
    haptic('tap');
    setRefreshing(true);
    void load();
  };

  return (
    <div className="neon-shell app-screen flex flex-col max-w-md mx-auto px-5 pt-safe pb-safe overflow-hidden">
      <header className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl neon-muted hover:bg-cyan-950/70 hover:text-cyan-200 active:scale-90 transition"
          aria-label="Назад"
        >
          <ChevronLeft className="w-6 h-6" aria-hidden="true" />
        </button>
        <h2 className="neon-title text-lg font-bold flex-1">Глобальный рейтинг</h2>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="p-2 rounded-xl neon-muted hover:bg-cyan-950/70 hover:text-cyan-200 active:scale-90 transition disabled:opacity-40"
          aria-label="Обновить рейтинг"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </header>

      <div className="neon-panel flex items-center gap-2 px-3 py-3 mb-4 rounded-xl text-xs neon-muted">
        <span className="font-semibold neon-accent">Топ-10</span>
        <span>игроков. В таблице — лучший рекорд каждого за одну игру.</span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-cyan-300 animate-spin mb-3 drop-shadow-[0_0_10px_rgba(24,235,218,0.8)]" aria-hidden="true" />
          <p className="neon-muted text-sm">Загрузка рейтинга...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl neon-panel flex items-center justify-center mb-3">
            <Trophy className="w-7 h-7 text-cyan-300 drop-shadow-[0_0_8px_rgba(24,235,218,0.8)]" aria-hidden="true" />
          </div>
          <p className="neon-muted text-sm max-w-xs">
            Не удалось загрузить рейтинг. Проверьте соединение и попробуйте ещё раз.
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl neon-panel flex items-center justify-center mb-3">
            <Trophy className="w-7 h-7 text-cyan-300 drop-shadow-[0_0_8px_rgba(24,235,218,0.8)]" aria-hidden="true" />
          </div>
          <p className="neon-muted text-sm max-w-xs">
            Пока никто не выиграл. Сыграйте в одиночном режиме, чтобы открыть рейтинг!
          </p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto overscroll-contain">
          {entries.map((entry, idx) => (
            <Row key={entry.username} entry={entry} rank={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ entry, rank }: { entry: GlobalScore; rank: number }) {
  const medal = rank === 1;
  const silver = rank === 2;
  const bronze = rank === 3;

  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-2xl border transition ${
      medal
        ? 'bg-gradient-to-r from-amber-950/80 to-orange-950/60 border-amber-400/50 shadow-[0_0_16px_rgba(255,185,0,0.15)]'
        : silver
        ? 'bg-slate-900/60 border-slate-400/30'
        : bronze
        ? 'bg-orange-950/40 border-orange-400/30'
        : 'neon-panel'
    }`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
        medal
          ? 'bg-gradient-to-br from-amber-300 to-orange-600 text-slate-950 shadow-[0_0_14px_rgba(255,185,0,0.7)]'
          : silver
          ? 'bg-gradient-to-br from-slate-200 to-slate-500 text-slate-950'
          : bronze
          ? 'bg-gradient-to-br from-orange-300 to-orange-600 text-white'
          : 'bg-slate-950/70 text-cyan-200 border border-cyan-900'
      }`}>
        {medal ? <Crown className="w-5 h-5" aria-hidden="true" /> : rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm truncate ${medal || silver || bronze ? 'text-white' : 'on-panel'}`}>{entry.username}</p>
        <p className="neon-muted text-xs">{entry.wins} {pluralWins(entry.wins)}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-lg font-black score-value">
          {entry.score}
        </span>
        <span className="text-[10px] neon-muted uppercase tracking-wide">очков</span>
      </div>
      {medal && <Medal className="w-5 h-5 text-amber-400 flex-shrink-0" aria-hidden="true" />}
    </div>
  );
}

function pluralWins(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'победа';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'победы';
  return 'побед';
}
