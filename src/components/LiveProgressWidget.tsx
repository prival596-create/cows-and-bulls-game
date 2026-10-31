import { useCallback, useEffect, useState } from 'react';
import { Users, Loader2, Zap, CheckCircle2 } from 'lucide-react';
import {
  getRoom,
  normalizePlayerName,
  rankPlayers,
  type OnlineRoom,
  type RoomPlayer,
} from '@/lib/online-rooms';

interface LiveProgressWidgetProps {
  roomCode: string;
  myName: string;
  refreshKey: number;
  onRoomFinished?: () => void;
}

export default function LiveProgressWidget({
  roomCode,
  myName,
  refreshKey,
  onRoomFinished,
}: LiveProgressWidgetProps) {
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getRoom(roomCode);
    setRoom(data);
    setLoading(false);
    if (data?.status === 'finished') onRoomFinished?.();
  }, [roomCode, onRoomFinished]);

  // Мгновенное обновление после собственной догадки
  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  // Опрос комнаты, только когда вкладка видима
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const interval = setInterval(tick, 3500);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [load]);

  if (loading && !room) {
    return (
      <div className="neon-panel rounded-2xl px-4 py-3 mb-4 flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-cyan-300 animate-spin" aria-hidden="true" />
        <span className="neon-muted text-xs">Загрузка прогресса...</span>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="neon-panel rounded-2xl px-4 py-3 mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-orange-300" aria-hidden="true" />
        <span className="neon-muted text-xs">Комната недоступна</span>
      </div>
    );
  }

  const sorted = rankPlayers(room.players);
  const myCleanName = normalizePlayerName(myName);

  return (
    <div className="neon-panel rounded-2xl px-4 py-3 mb-4">
      <div className="flex items-center gap-2 mb-2.5">
        <Users className="w-4 h-4 text-cyan-300 drop-shadow-[0_0_6px_rgba(24,235,218,0.7)]" aria-hidden="true" />
        <span className="neon-accent text-xs font-bold uppercase tracking-wide">Прогресс друзей</span>
        <span className="ml-auto text-[10px] neon-muted">обновляется автоматически</span>
      </div>
      <div className="space-y-1.5">
        {sorted.map((player, idx) => {
          const isMe = player.username === myCleanName;
          return (
            <div
              key={player.username}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition ${
                isMe ? 'progress-row-me' : 'progress-row'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] flex-shrink-0 ${
                  idx === 0
                    ? 'bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950'
                    : isMe
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                {idx + 1}
              </span>
              <span
                className={`font-bold truncate flex-1 ${
                  isMe ? 'progress-name-me' : 'on-panel'
                }`}
              >
                {player.username}
              </span>
              {player.finished && (
                <CheckCircle2
                  className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0"
                  aria-label={`Финишировал за ${player.attempts} попыток`}
                />
              )}
              <span className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-rose-300 font-bold">{player.max_bulls}Б</span>
                <span className="text-yellow-300 font-bold">{player.max_cows}К</span>
                <span className="neon-muted">({player.total_attempts})</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { RoomPlayer };
