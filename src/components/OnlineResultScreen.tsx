import { useEffect, useState } from 'react';
import {
  Trophy,
  Crown,
  Loader2,
  Home,
  RefreshCw,
  Share2,
  Sparkles,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { haptic, shareText } from '@/lib/telegram-api';
import {
  finishRoomIfComplete,
  getRoom,
  getRoomOutcome,
  isRoomComplete,
  normalizePlayerName,
  setRoomStatus,
  type OnlineRoom,
  type RoomPlayer,
} from '@/lib/online-rooms';
import { digitsLabel } from '@/game/difficulty';
import { pluralAttempts } from '@/game/format';

interface OnlineResultScreenProps {
  room: OnlineRoom;
  myName: string;
  secret: string;
  digits: number;
  myAttempts: number;
  myFinished: boolean;
  onPlayAgain: () => void;
  onHome: () => void;
}

export default function OnlineResultScreen({
  room,
  myName,
  secret,
  digits,
  myAttempts,
  myFinished,
  onPlayAgain,
  onHome,
}: OnlineResultScreenProps) {
  const [liveRoom, setLiveRoom] = useState<OnlineRoom>(room);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Обновляем таблицу, пока игра не закончена. Как только все отгадали —
  // закрываем комнату (это может сделать любой клиент, операция идемпотентна).
  useEffect(() => {
    if (liveRoom.status === 'finished') return;

    let cancelled = false;

    const sync = async () => {
      const fresh = await getRoom(room.code);
      if (cancelled || !fresh) return;

      setLiveRoom(fresh);

      if (fresh.status !== 'finished') {
        const completed = await finishRoomIfComplete(fresh);
        if (completed && !cancelled) {
          const after = await getRoom(room.code);
          if (!cancelled && after) setLiveRoom(after);
        }
      }
    };

    void sync();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void sync();
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [room.code, liveRoom.status]);

  const myCleanName = normalizePlayerName(myName);
  const players = liveRoom.players.map((player) => {
    if (player.username !== myCleanName) return player;
    if (myFinished && !player.finished) {
      return { ...player, finished: true, attempts: myAttempts || player.attempts };
    }
    return player;
  });

  // Если запись игрока ещё не успела дойти до базы — показываем его сами
  if (myFinished && !players.some((player) => player.username === myCleanName)) {
    players.push({
      username: myCleanName,
      max_bulls: 0,
      max_cows: 0,
      total_attempts: myAttempts,
      finished: true,
      attempts: myAttempts,
    });
  }

  const allFinished = isRoomComplete(players);
  const outcomeRoom: OnlineRoom = {
    ...liveRoom,
    players,
    status:
      liveRoom.status === 'finished' || allFinished ? 'finished' : liveRoom.status,
  };
  const { ranked, winner, loser, forfeit } = getRoomOutcome(outcomeRoom);
  const isFinished = outcomeRoom.status === 'finished';
  const me = players.find((player) => player.username === myCleanName) ?? null;
  const isLoser = Boolean(loser && me && loser.username === me.username);

  useEffect(() => {
    if (isFinished && isLoser) haptic('warning');
  }, [isFinished, isLoser]);

  const handleFinishNow = async () => {
    haptic('tap');
    setFinishing(true);
    await setRoomStatus(liveRoom.id, 'finished');
    const fresh = await getRoom(room.code);
    if (fresh) setLiveRoom(fresh);
    setFinishing(false);
    setConfirmFinish(false);
  };

  const handleShare = () => {
    haptic('tap');

    if (!isFinished) {
      shareText(
        `Присоединяйтесь к игре «Быки и Коровы» 🐂🐄\nКод комнаты: ${room.code}\nСложность: ${digits} ${digitsLabel(digits)}.`
      );
      return;
    }

    const lines = ranked.map(
      (player, index) =>
        `${index + 1}. ${player.username} — ${
          player.finished
            ? `${player.attempts} ${pluralAttempts(player.attempts)}`
            : 'не отгадал'
        }`
    );
    const forfeitLine =
      forfeit && loser ? `\n\n🎭 Фант: ${loser.username} — ${forfeit}` : '';

    shareText(
      `🐂🐄 Итоги игры «Быки и Коровы»\nКомната ${room.code}\n\n${lines.join('\n')}${forfeitLine}`
    );
  };

  const title = isFinished ? 'Итоги игры' : myFinished ? 'Вы отгадали!' : 'Игра идёт';

  return (
    <div className="neon-shell app-screen flex flex-col max-w-md mx-auto px-5 pt-safe pb-safe overflow-y-auto overscroll-contain">
      <header className="flex items-center gap-3 mb-5">
        <div className="flex-1">
          <h2 className="neon-title text-xl font-black leading-tight">{title}</h2>
          <p className="neon-muted text-xs">
            Комната {room.code} · {digits} {digitsLabel(digits)}
          </p>
        </div>
        <Trophy className="w-7 h-7 text-yellow-300 drop-shadow-[0_0_10px_rgba(255,213,65,0.8)]" aria-hidden="true" />
      </header>

      {!isFinished && (
        <div className="neon-panel rounded-2xl p-5 mb-4 text-center">
          <Loader2 className="w-8 h-8 text-cyan-300 animate-spin mx-auto mb-3" aria-hidden="true" />
          <p className="on-panel font-bold text-sm mb-1">
            {myFinished ? 'Вы отгадали! Ждём остальных' : 'Игра ещё идёт'}
          </p>
          <p className="neon-muted text-xs leading-relaxed">
            Таблица обновится автоматически. Когда все отгадают, здесь появится
            итоговое место и фант для последнего игрока.
          </p>
        </div>
      )}

      {isFinished && (
        <div className="neon-panel rounded-2xl p-5 mb-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 shadow-[0_0_24px_rgba(255,180,60,0.45)] flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-8 h-8 text-white" fill="white" aria-hidden="true" />
          </div>
          {winner ? (
            <>
              <p className="neon-muted text-[10px] uppercase tracking-wide mb-1">
                Победитель
              </p>
              <p className="neon-title text-2xl font-black mb-1">
                {winner.username}
              </p>
              <p className="neon-muted text-xs">
                {winner.attempts} {pluralAttempts(winner.attempts)}
              </p>
            </>
          ) : (
            <>
              <p className="neon-title text-xl font-black mb-1">
                Никто не отгадал
              </p>
              <p className="neon-muted text-xs">
                Игра завершена, но секрет остался неразгаданным.
              </p>
            </>
          )}
        </div>
      )}

      <div className="neon-panel rounded-2xl p-4 mb-4">
        <p className="neon-muted text-[10px] uppercase tracking-wide mb-2">
          Секретное число
        </p>
        <div className="flex justify-center gap-1.5">
          {secret.split('').map((digit, index) => (
            <span
              key={index}
              className="w-9 h-11 rounded-xl flex items-center justify-center text-xl font-black text-white bg-gradient-to-br from-emerald-400 to-teal-600"
            >
              {digit}
            </span>
          ))}
        </div>
      </div>

      <div className="neon-panel rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-cyan-300" aria-hidden="true" />
          <p className="neon-accent text-xs font-bold uppercase tracking-wide">
            {isFinished ? 'Финальная таблица' : 'Текущий прогресс'}
          </p>
          <span className="ml-auto text-[10px] neon-muted">
            {players.length} игроков
          </span>
        </div>
        <div className="space-y-1.5">
          {ranked.map((player, index) => (
            <ResultRow
              key={player.username}
              player={player}
              index={index}
              isMe={player.username === myCleanName}
              isLoser={Boolean(isFinished && loser && player.username === loser.username)}
              finished={isFinished}
            />
          ))}
        </div>
      </div>

      {isFinished && forfeit && loser && (
        <div className="rounded-2xl p-5 mb-4 border-2 border-orange-400/60 bg-gradient-to-br from-orange-950/70 to-rose-950/50 shadow-[0_0_24px_rgba(251,146,60,0.2)]">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-orange-300" aria-hidden="true" />
            <p className="neon-orange text-xs font-bold uppercase tracking-wide">
              Фант для последнего места
            </p>
          </div>
          <p className="on-panel font-black text-lg mb-1">{loser.username}</p>
          <p className="text-orange-100 text-sm leading-relaxed">«{forfeit}»</p>
          {isLoser && (
            <p className="neon-muted text-xs mt-3">
              Это вы! Придётся выполнить 😄
            </p>
          )}
        </div>
      )}

      <div className="mt-auto space-y-3">
        {!isFinished && (
          confirmFinish ? (
            <div className="neon-panel rounded-2xl p-3">
              <p className="neon-muted text-xs text-center mb-2">
                Завершить игру, не дожидаясь остальных?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleFinishNow}
                  disabled={finishing}
                  className="neon-button flex-1 py-2.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {finishing ? 'Завершаем...' : 'Да, завершить'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmFinish(false)}
                  className="neon-button-secondary flex-1 py-2.5 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                haptic('tap');
                setConfirmFinish(true);
              }}
              className="neon-button-secondary w-full py-3.5 rounded-2xl font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <Clock className="w-5 h-5" aria-hidden="true" />
              Завершить игру и показать итоги
            </button>
          )
        )}

        {isFinished && (
          <button
            type="button"
            onClick={() => {
              haptic('tap');
              onPlayAgain();
            }}
            className="neon-button w-full py-4 rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" aria-hidden="true" />
            Играть снова
          </button>
        )}

        <button
          type="button"
          onClick={handleShare}
          className="neon-button-secondary w-full py-3.5 rounded-2xl font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" aria-hidden="true" />
          {isFinished ? 'Поделиться итогами' : 'Пригласить друзей'}
        </button>

        <button
          type="button"
          onClick={() => {
            haptic('tap');
            onHome();
          }}
          className="neon-button-secondary w-full py-3.5 rounded-2xl font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" aria-hidden="true" />
          В главное меню
        </button>
      </div>
    </div>
  );
}

function ResultRow({
  player,
  index,
  isMe,
  isLoser,
  finished,
}: {
  player: RoomPlayer;
  index: number;
  isMe: boolean;
  isLoser: boolean;
  finished: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
        isMe ? 'progress-row-me' : 'progress-row'
      } ${isLoser ? 'border border-orange-400/60' : ''}`}
    >
      <span
        className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px] flex-shrink-0 ${
          index === 0
            ? 'bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950'
            : isMe
            ? 'bg-cyan-400 text-slate-950'
            : 'bg-slate-700 text-slate-200'
        }`}
      >
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        <p
          className={`font-bold text-sm truncate ${
            isMe ? 'progress-name-me' : 'on-panel'
          }`}
        >
          {player.username}
          {isMe ? ' (вы)' : ''}
        </p>
        <p className="neon-muted text-[10px] leading-tight">
          {player.finished ? (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-300" aria-hidden="true" />
              Отгадал за {player.attempts} {pluralAttempts(player.attempts)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <XCircle className="w-3 h-3 text-rose-300" aria-hidden="true" />
              Не отгадал · {player.max_bulls}Б {player.max_cows}К за{' '}
              {player.total_attempts} {pluralAttempts(player.total_attempts)}
            </span>
          )}
        </p>
      </div>

      {index === 0 && (
        <Crown className="w-4 h-4 text-amber-300 flex-shrink-0" aria-label="Победитель" />
      )}
      {isLoser && finished && (
        <span className="text-[10px] font-bold text-orange-300 border border-orange-400/50 rounded px-1.5 py-0.5 flex-shrink-0">
          ФАНТ
        </span>
      )}
    </div>
  );
}
