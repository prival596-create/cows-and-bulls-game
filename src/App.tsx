import { useCallback, useEffect, useState } from 'react';
import { TelegramProvider, useTelegram } from '@/lib/telegram';
import { useTelegramBackButton, haptic } from '@/lib/telegram-api';
import { useHideBoltBadge } from '@/lib/badge';
import { generateSecret, evaluateGuess, isValidGuess, type GameMode, type GuessResult } from '@/game/logic';
import HomeScreen from '@/components/HomeScreen';
import LeaderboardScreen from '@/components/LeaderboardScreen';
import GameScreen from '@/components/GameScreen';
import WinScreen from '@/components/WinScreen';
import OnlineRoomScreen from '@/components/OnlineRoomScreen';
import OnlineResultScreen from '@/components/OnlineResultScreen';
import LiveProgressWidget from '@/components/LiveProgressWidget';
import { ThemeProvider } from '@/lib/theme';
import { addScoreToGlobal, calculateWinScore } from '@/lib/leaderboard';
import {
  cleanupStaleRooms,
  setRoomStatus,
  updatePlayerProgress,
  type OnlineRoom,
} from '@/lib/online-rooms';

type Screen =
  | 'home'
  | 'leaderboard'
  | 'onlineSetup'
  | 'playing'
  | 'win'
  | 'onlineResult';

interface PlayerState {
  history: GuessResult[];
  slots: (string | null)[];
  cursor: number;
  error: string | null;
}

const blankPlayer = (digits: number): PlayerState => ({
  history: [],
  slots: Array<string | null>(digits).fill(null),
  cursor: 0,
  error: null,
});

/** Следующая пустая клетка после текущей (по кругу). */
function nextEmptySlot(slots: (string | null)[], from: number): number {
  const total = slots.length;
  for (let step = 1; step <= total; step++) {
    const index = (from + step) % total;
    if (slots[index] === null) return index;
  }
  return from;
}

function placeDigit(state: PlayerState, digit: string): PlayerState {
  if (state.slots.includes(digit)) return state;
  if (state.slots[state.cursor] !== null) return state;

  const slots = [...state.slots];
  slots[state.cursor] = digit;
  return { ...state, slots, cursor: nextEmptySlot(slots, state.cursor), error: null };
}

/** Нажатие на клетку: выбираем её и очищаем, если там уже была цифра. */
function selectSlot(state: PlayerState, index: number): PlayerState {
  if (index < 0 || index >= state.slots.length) return state;

  const slots = [...state.slots];
  slots[index] = null;
  return { ...state, slots, cursor: index, error: null };
}

function deleteDigit(state: PlayerState): PlayerState {
  const slots = [...state.slots];

  if (slots[state.cursor] !== null) {
    slots[state.cursor] = null;
    return { ...state, slots, error: null };
  }

  for (let step = 1; step <= slots.length; step++) {
    const index = (state.cursor - step + slots.length) % slots.length;
    if (slots[index] !== null) {
      slots[index] = null;
      return { ...state, slots, cursor: index, error: null };
    }
  }

  return state;
}

function GameApp() {
  const { user } = useTelegram();
  const playerName = user?.username ? `@${user.username}` : user?.firstName || 'Игрок';
  const [screen, setScreen] = useState<Screen>('home');
  const [digits, setDigits] = useState(4);
  const [mode, setMode] = useState<GameMode>('solo');
  const [secret, setSecret] = useState('');

  // Solo
  const [soloState, setSoloState] = useState<PlayerState>(() => blankPlayer(4));

  // Online
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoom | null>(null);
  const [onlineState, setOnlineState] = useState<PlayerState>(() => blankPlayer(4));
  const [onlineFinished, setOnlineFinished] = useState(false);
  const [onlineRefreshKey, setOnlineRefreshKey] = useState(0);

  const goHome = useCallback(() => setScreen('home'), []);

  const leaveOnline = useCallback(() => {
    setOnlineRoom(null);
    setOnlineState(blankPlayer(digits));
    setOnlineFinished(false);
    setScreen('home');
  }, [digits]);

  useTelegramBackButton(
    screen !== 'home',
    screen === 'onlineResult' ? leaveOnline : goHome
  );
  useHideBoltBadge();

  // Убираем брошенные комнаты, не дожидаясь отдельной cron-задачи
  useEffect(() => {
    void cleanupStaleRooms();
  }, []);

  // ---------- Handlers ----------

  const startSolo = (d: number) => {
    setDigits(d);
    setMode('solo');
    setSecret(generateSecret(d));
    setSoloState(blankPlayer(d));
    setScreen('playing');
  };

  const playAgain = () => {
    if (mode === 'online') {
      setOnlineRoom(null);
      setOnlineState(blankPlayer(digits));
      setOnlineFinished(false);
      setScreen('onlineSetup');
    } else {
      startSolo(digits);
    }
  };

  // ---- Solo input ----
  const handleSoloInput = (d: string) => {
    setSoloState((state) => placeDigit(state, d));
    haptic('tap');
  };
  const handleSoloSelectSlot = (index: number) => {
    setSoloState((state) => selectSlot(state, index));
    haptic('select');
  };
  const handleSoloDelete = () => {
    setSoloState((state) => deleteDigit(state));
    haptic('tap');
  };
  const handleSoloSubmit = () => {
    const state = soloState;

    if (state.slots.some((digit) => digit === null)) {
      setSoloState({ ...state, error: 'Заполните все клетки' });
      haptic('error');
      return;
    }

    const guess = state.slots.join('');
    if (!isValidGuess(guess, digits)) {
      setSoloState({ ...state, error: `Введите ${digits} уникальные цифры` });
      haptic('error');
      return;
    }

    const result = evaluateGuess(secret, guess);
    const history = [...state.history, result];
    const won = result.bulls === digits;

    setSoloState({
      ...state,
      history,
      slots: Array<string | null>(digits).fill(null),
      cursor: 0,
      error: null,
    });

    if (won) {
      haptic('success');
      void addScoreToGlobal(playerName, calculateWinScore(digits, history.length)).catch(() => {
        /* рейтинг не должен ломать завершение игры */
      });
      setScreen('win');
    } else {
      haptic('tap');
    }
  };

  // ---- Online ----
  const handleOnlineRoomReady = (room: OnlineRoom) => {
    setOnlineRoom(room);
    setSecret(room.secret);
    setDigits(room.digits);
    setOnlineState(blankPlayer(room.digits));
    setOnlineFinished(false);
    setScreen('playing');
    void setRoomStatus(room.id, 'playing');
  };

  const getBestResult = (history: GuessResult[]): { maxBulls: number; maxCows: number } => {
    let maxBulls = 0;
    let maxCows = 0;
    for (const h of history) {
      if (h.bulls > maxBulls) maxBulls = h.bulls;
      if (h.cows > maxCows) maxCows = h.cows;
    }
    return { maxBulls, maxCows };
  };

  const syncOnlineProgress = (history: GuessResult[], finished: boolean, finalAttempts: number) => {
    if (!onlineRoom) return;
    const { maxBulls, maxCows } = getBestResult(history);
    void updatePlayerProgress(
      onlineRoom.id,
      playerName,
      maxBulls,
      maxCows,
      history.length,
      finished,
      finalAttempts
    );
    setOnlineRefreshKey((key) => key + 1);
  };

  const handleOnlineInput = (d: string) => {
    setOnlineState((state) => placeDigit(state, d));
    haptic('tap');
  };
  const handleOnlineSelectSlot = (index: number) => {
    setOnlineState((state) => selectSlot(state, index));
    haptic('select');
  };
  const handleOnlineDelete = () => {
    setOnlineState((state) => deleteDigit(state));
    haptic('tap');
  };
  const handleOnlineSubmit = () => {
    const state = onlineState;

    if (state.slots.some((digit) => digit === null)) {
      setOnlineState({ ...state, error: 'Заполните все клетки' });
      haptic('error');
      return;
    }

    const guess = state.slots.join('');
    if (!isValidGuess(guess, digits)) {
      setOnlineState({ ...state, error: `Введите ${digits} уникальные цифры` });
      haptic('error');
      return;
    }

    const result = evaluateGuess(secret, guess);
    const history = [...state.history, result];
    const won = result.bulls === digits;

    setOnlineState({
      ...state,
      history,
      slots: Array<string | null>(digits).fill(null),
      cursor: 0,
      error: null,
    });
    syncOnlineProgress(history, won, won ? history.length : 0);

    if (won) {
      haptic('success');
      setOnlineFinished(true);
      void addScoreToGlobal(playerName, calculateWinScore(digits, history.length)).catch(() => {
        /* рейтинг не должен ломать завершение игры */
      });
      setScreen('onlineResult');
    } else {
      haptic('tap');
    }
  };

  const handleOnlineRoomFinished = useCallback(() => {
    setScreen('onlineResult');
  }, []);

  // ---------- Render ----------

  if (screen === 'home') {
    return (
      <HomeScreen
        onStart={startSolo}
        onLeaderboard={() => setScreen('leaderboard')}
        onOnlineSetup={(d) => { setDigits(d); setMode('online'); setScreen('onlineSetup'); }}
      />
    );
  }

  if (screen === 'leaderboard') {
    return <LeaderboardScreen onBack={goHome} />;
  }

  if (screen === 'onlineSetup') {
    return (
      <OnlineRoomScreen
        digits={digits}
        onRoomReady={handleOnlineRoomReady}
        onBack={goHome}
      />
    );
  }

  if (screen === 'onlineResult' && onlineRoom) {
    return (
      <OnlineResultScreen
        room={onlineRoom}
        myName={playerName}
        secret={secret}
        digits={digits}
        myAttempts={onlineState.history.length}
        myFinished={onlineFinished}
        onPlayAgain={playAgain}
        onHome={leaveOnline}
      />
    );
  }

  if (screen === 'win') {
    return (
      <WinScreen
        winnerName="Вы отгадали!"
        secret={secret}
        digits={digits}
        attempts={soloState.history.length}
        onPlayAgain={playAgain}
        onHome={goHome}
      />
    );
  }

  // Playing
  if (mode === 'online' && onlineRoom) {
    return (
      <GameScreen
        digits={digits}
        history={onlineState.history}
        slots={onlineState.slots}
        cursor={onlineState.cursor}
        error={onlineState.error}
        onInput={handleOnlineInput}
        onDelete={handleOnlineDelete}
        onSelectSlot={handleOnlineSelectSlot}
        onSubmit={handleOnlineSubmit}
        onExit={goHome}
        turnLabel={`Онлайн · ${onlineRoom.code}`}
        liveWidget={
          <LiveProgressWidget
            roomCode={onlineRoom.code}
            myName={playerName}
            refreshKey={onlineRefreshKey}
            onRoomFinished={handleOnlineRoomFinished}
          />
        }
      />
    );
  }

  // Solo
  return (
    <GameScreen
      digits={digits}
      history={soloState.history}
      slots={soloState.slots}
      cursor={soloState.cursor}
      error={soloState.error}
      onInput={handleSoloInput}
      onDelete={handleSoloDelete}
      onSelectSlot={handleSoloSelectSlot}
      onSubmit={handleSoloSubmit}
      onExit={goHome}
      turnLabel="Одиночная игра"
    />
  );
}

export default function App() {
  return (
    <TelegramProvider>
      <ThemeProvider>
        <GameApp />
      </ThemeProvider>
    </TelegramProvider>
  );
}
