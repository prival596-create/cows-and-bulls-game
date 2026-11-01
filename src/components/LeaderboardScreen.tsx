import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, Trophy, Loader2, RefreshCw, Zap, Brain } from 'lucide-react';
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

  // Сортировка: самый активный = больше побед
  const byWins = [...entries].sort((a, b) => b.wins - a.wins || b.score - a.score);
  // Сортировка: самый умный = больше очков
  const byScore = [...entries].sort((a, b) => b.score - a.score || b.wins - a.wins);

  return (
    <div className="neon-shell app-screen max-w-md mx-auto px-5 pt-safe pb-safe overflow-y-auto overscroll-contain min-h-screen">
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
        <span>игроков. Активность — по победам, ум — по очкам.</span>
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
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-2 gap-4">
            {/* Колонка: Самый активный */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-300" aria-hidden="true" />
                <h3 className="neon-accent text-sm font-bold uppercase tracking-wide">
                  Самый активный
                </h3>
              </div>
              <p className="neon-muted text-[10px] mb-2">Суммарный рейтинг</p>
              <div className="space-y-2">
                {byWins.slice(0, 5).map((entry, idx) => (
                  <ActiveRow key={entry.username} entry={entry} rank={idx + 1} />
                ))}
              </div>
            </div>

            {/* Колонка: Самый умный */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-purple-300" aria-hidden="true" />
                <h3 className="text-purple-300 text-sm font-bold uppercase tracking-wide">
                  Самый умный
                </h3>
              </div>
              <p className="neon-muted text-[10px] mb-2">Рейтинг по среднему</p>
              <div className="space-y-2">
                {byScore.slice(0, 5).map((entry, idx) => (
                  <SmartRow key={entry.username} entry={entry} rank={idx + 1} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveRow({ entry, rank }: { entry: GlobalScore; rank: number }) {
  const isTop = rank <= 3;

  return (
    <div className={`flex items-center gap-2 p-2.5 rounded-xl border transition ${
      rank === 1
        ? 'bg-gradient-to-r from-amber-950/80 to-orange-950/60 border-amber-400/50 shadow-[0_0_16px_rgba(255,185,0,0.15)]'
        : rank === 2
        ? 'bg-slate-900/60 border-slate-400/30'
        : rank === 3
        ? 'bg-orange-950/40 border-orange-400/30'
        : 'neon-panel'
    }`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${
        rank === 1
          ? 'bg-gradient-to-br from-amber-300 to-orange-600 text-slate-950 shadow-[0_0_10px_rgba(255,185,0,0.7)]'
          : rank === 2
          ? 'bg-gradient-to-br from-slate-200 to-slate-500 text-slate-950'
          : rank === 3
          ? 'bg-gradient-to-br from-orange-300 to-orange-600 text-white'
          : 'bg-slate-950/70 text-cyan-200 border border-cyan-900'
      }`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-xs truncate ${isTop ? 'text-white' : 'on-panel'}`}>{entry.username}</p>
        <p className="neon-muted text-[10px]">{entry.wins} побед</p>
      </div>
      <div className="flex flex-col items-end flex-shrink-0">
        <span className="text-sm font-black score-value">{entry.score}</span>
        <span className="text-[9px] neon-muted">очков</span>
      </div>
    </div>
  );
}

function SmartRow({ entry, rank }: { entry: GlobalScore; rank: number }) {
  const isTop = rank <= 3;
  const avgScore = entry.wins > 0 ? Math.round(entry.score / entry.wins) : entry.score;

  return (
    <div className={`flex items-center gap-2 p-2.5 rounded-xl border transition ${
      rank === 1
        ? 'bg-gradient-to-r from-purple-950/80 to-indigo-950/60 border-purple-400/50 shadow-[0_0_16px_rgba(168,85,247,0.15)]'
        : rank === 2
        ? 'bg-slate-900/60 border-slate-400/30'
        : rank === 3
        ? 'bg-blue-950/40 border-blue-400/30'
        : 'neon-panel'
    }`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${
        rank === 1
          ? 'bg-gradient-to-br from-purple-300 to-indigo-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.7)]'
          : rank === 2
          ? 'bg-gradient-to-br from-slate-200 to-slate-500 text-slate-950'
          : rank === 3
          ? 'bg-gradient-to-br from-blue-300 to-blue-600 text-white'
          : 'bg-slate-950/70 text-cyan-200 border border-cyan-900'
      }`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-xs truncate ${isTop ? 'text-white' : 'on-panel'}`}>{entry.username}</p>
        <p className="neon-muted text-[10px]">{entry.wins} побед</p>
      </div>
      <div className="flex flex-col items-end flex-shrink-0">
        <span className="text-sm font-black text-purple-300">{avgScore}</span>
        <span className="text-[9px] neon-muted">в среднем</span>
      </div>
    </div>
  );
}
