import { useEffect, useState } from 'react';
import { ChevronLeft, Globe, Copy, Check, Users, Loader2, AlertCircle, Play, Share2 } from 'lucide-react';
import { useTelegram } from '@/lib/telegram';
import { haptic, shareText, copyToClipboard } from '@/lib/telegram-api';
import { createRoom, joinRoom, getRoom, type OnlineRoom } from '@/lib/online-rooms';
import { digitsLabel } from '@/game/difficulty';

interface OnlineRoomScreenProps {
  digits: number;
  onRoomReady: (room: OnlineRoom) => void;
  onBack: () => void;
}

type Tab = 'create' | 'join';

export default function OnlineRoomScreen({ digits, onRoomReady, onBack }: OnlineRoomScreenProps) {
  const { user } = useTelegram();
  const playerName = user?.username ? `@${user.username}` : user?.firstName || 'Игрок';

  const [tab, setTab] = useState<Tab>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [createdRoom, setCreatedRoom] = useState<OnlineRoom | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  // Пока комната открыта, подтягиваем новых игроков
  const roomCode = createdRoom?.code;
  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;

    const sync = async () => {
      const fresh = await getRoom(roomCode);
      if (cancelled || !fresh) return;
      setCreatedRoom((prev) => (prev ? { ...prev, players: fresh.players, status: fresh.status } : prev));
    };

    const interval = setInterval(sync, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [roomCode]);

  const handleCreate = async () => {
    haptic('tap');
    setLoading(true);
    setError(null);

    const secret = generateOnlineSecret(digits);
    const room = await createRoom(playerName, digits, secret);

    if (!room) {
      setError('Не удалось создать комнату. Попробуйте ещё раз.');
      haptic('error');
      setLoading(false);
      return;
    }

    setCreatedRoom(room);
    setLoading(false);
  };

  const handleJoin = async () => {
    haptic('tap');
    if (joinCode.trim().length !== 6) {
      setError('Введите 6-значный код комнаты');
      return;
    }

    setLoading(true);
    setError(null);

    const { room, error: joinError } = await joinRoom(joinCode, playerName);

    if (!room) {
      setError(
        joinError === 'finished'
          ? 'Эта игра уже завершена. Создайте новую комнату.'
          : 'Комната не найдена. Проверьте код.'
      );
      haptic('error');
      setLoading(false);
      return;
    }

    haptic('success');
    onRoomReady(room);
  };

  const handleCopyCode = async () => {
    if (!createdRoom) return;
    haptic('tap');
    const ok = await copyToClipboard(createdRoom.code);
    setCopied(ok);
    setCopyFailed(!ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!createdRoom) return;
    haptic('tap');
    shareText(
      `Присоединяйся к игре «Быки и Коровы» 🐂🐄\nКод комнаты: ${createdRoom.code}\nСложность: ${createdRoom.digits} цифр.`
    );
  };

  const handleStartGame = () => {
    if (!createdRoom) return;
    haptic('tap');
    onRoomReady(createdRoom);
  };

  return (
    <div className="neon-shell app-screen flex flex-col max-w-md mx-auto px-5 pt-safe pb-safe overflow-y-auto overscroll-contain">
      <header className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl neon-muted hover:bg-cyan-950/70 hover:text-cyan-200 active:scale-90 transition"
          aria-label="Назад"
        >
          <ChevronLeft className="w-6 h-6" aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h2 className="neon-title text-lg font-bold leading-tight">Онлайн с друзьями</h2>
          <p className="neon-muted text-xs">{digits} {digitsLabel(digits)} · код комнаты для приглашения</p>
        </div>
        <Globe className="w-6 h-6 text-cyan-300 drop-shadow-[0_0_8px_rgba(24,235,218,0.7)]" aria-hidden="true" />
      </header>

      {!createdRoom && (
        <div className="flex gap-2 mb-5 p-1 rounded-2xl neon-panel">
          <TabButton active={tab === 'create'} onClick={() => { setTab('create'); setError(null); }}>
            Создать
          </TabButton>
          <TabButton active={tab === 'join'} onClick={() => { setTab('join'); setError(null); }}>
            Присоединиться
          </TabButton>
        </div>
      )}

      {error && (
        <div role="alert" className="mb-4 px-4 py-3 rounded-xl bg-rose-950/70 border border-rose-400/60 text-rose-200 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {tab === 'create' && !createdRoom && (
        <div className="flex-1 flex flex-col">
          <div className="neon-panel rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-300 to-cyan-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="on-panel font-bold text-sm">Создать комнату</p>
                <p className="neon-muted text-xs">Вы — хост. Поделитесь кодом с друзьями.</p>
              </div>
            </div>
            <p className="neon-muted text-xs leading-relaxed mb-3">
              После создания вы получите 6-значный код. Отправьте его друзьям — они введут его
              на экране «Присоединиться». Когда все готовы, нажмите «Начать игру».
            </p>
            <p className="neon-muted text-xs leading-relaxed">
              Игра идёт до последнего: когда все отгадают, появится финальная таблица,
              а последнее место получит случайный фант.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            className="neon-button flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Globe className="w-5 h-5" aria-hidden="true" />}
            {loading ? 'Создание...' : 'Создать комнату'}
          </button>
        </div>
      )}

      {tab === 'join' && !createdRoom && (
        <div className="flex-1 flex flex-col">
          <div className="neon-panel rounded-2xl p-5 mb-5">
            <label htmlFor="room-code" className="on-panel font-bold text-sm mb-1 block">Введите код комнаты</label>
            <p className="neon-muted text-xs mb-4">6 букв/цифр от вашего друга</p>
            <input
              id="room-code"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABCDEF"
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="neon-input w-full px-4 py-4 rounded-xl text-center text-2xl font-black tracking-[0.4em] focus:outline-none transition uppercase"
            />
          </div>

          <button
            type="button"
            onClick={handleJoin}
            disabled={loading || joinCode.trim().length !== 6}
            className="neon-button flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Play className="w-5 h-5 fill-current" aria-hidden="true" />}
            {loading ? 'Подключение...' : 'Присоединиться'}
          </button>
        </div>
      )}

      {createdRoom && (
        <div className="flex-1 flex flex-col">
          <div className="neon-panel rounded-2xl p-6 mb-5 text-center">
            <p className="neon-muted text-xs uppercase tracking-wide mb-3">Код вашей комнаты</p>
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-4xl font-black neon-accent tracking-[0.2em]">
                {createdRoom.code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-2.5 rounded-xl bg-slate-900/70 text-cyan-200 hover:bg-cyan-950/70 transition active:scale-90"
                aria-label="Копировать код"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-300" aria-hidden="true" /> : <Copy className="w-5 h-5" aria-hidden="true" />}
              </button>
            </div>
            {copyFailed ? (
              <p className="neon-muted text-xs">Скопируйте код вручную — буфер обмена недоступен.</p>
            ) : (
              <p className="neon-muted text-xs">
                Отправьте этот код друзьям, чтобы они присоединились
              </p>
            )}
          </div>

          <div className="neon-panel rounded-2xl p-5 mb-5">
            <p className="neon-muted text-xs uppercase tracking-wide mb-3">
              Игроки в комнате · {createdRoom.players.length}
            </p>
            <div className="space-y-2">
              {createdRoom.players.map((p) => (
                <div key={p.username} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {p.username[0]?.toUpperCase()}
                  </div>
                  <span className="on-panel text-sm font-semibold">{p.username}</span>
                  {p.username === createdRoom.host_name && (
                    <span className="text-[10px] text-orange-300 font-bold ml-auto">ХОСТ</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <p className="neon-muted text-xs text-center">
              Вы можете начать игру сейчас — друзья присоединятся по коду во время игры.
            </p>
            <button
              type="button"
              onClick={handleShare}
              className="neon-button-secondary flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold active:scale-[0.98] transition-transform"
            >
              <Share2 className="w-5 h-5" aria-hidden="true" />
              Пригласить друзей
            </button>
            <button
              type="button"
              onClick={handleStartGame}
              className="neon-button flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-lg active:scale-[0.98] transition-transform"
            >
              <Play className="w-5 h-5 fill-current" aria-hidden="true" />
              Начать игру
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
        active
          ? 'bg-gradient-to-r from-teal-400 to-cyan-600 text-white shadow-[0_0_14px_rgba(24,235,218,0.5)]'
          : 'tab-inactive'
      }`}
    >
      {children}
    </button>
  );
}

function generateOnlineSecret(digits: number): string {
  const pool = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const secret: string[] = [];
  for (let i = 0; i < digits; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    secret.push(pool.splice(idx, 1)[0]);
  }
  return secret.join('');
}
