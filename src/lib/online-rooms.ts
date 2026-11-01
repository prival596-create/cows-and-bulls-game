import { supabase } from '@/lib/supabase';

export interface RoomPlayer {
  username: string;
  max_bulls: number;
  max_cows: number;
  total_attempts: number;
  finished: boolean;
  attempts: number;
}

export interface OnlineRoom {
  id: string;
  code: string;
  host_name: string;
  digits: number;
  secret: string;
  status: 'waiting' | 'playing' | 'finished';
  players: RoomPlayer[];
}

/** Пул фантов для игрока, который оказался последним. */
export const FORFEITS = [
  'Спеть куплет любой песни 🎤',
  'Прокукарекать три раза подряд 🐓',
  'Рассказать анекдот, даже если он несмешной 😄',
  'Изобразить пингвина и пройтись по комнате 🐧',
  'Скороговоркой сказать: «Шла Саша по шоссе и сосала сушку» 🗣️',
  'Станцевать 15 секунд без музыки 💃',
  'Признаться в любви холодильнику ❤️',
  'Сделать 10 приседаний и назвать это разминкой чемпиона 🏋️',
  'Изобразить своё любимое животное так, чтобы все угадали 🦁',
  'Рассказать короткое стихотворение с выражением 📖',
  'Сделать селфи с самым странным предметом рядом 🤳',
  'Сказать комплимент каждому игроку в комнате 💬',
  'Изобразить робота, который собирает «быков» и «коров» 🤖',
  'Спеть припев «В траве сидел кузнечик» 🦗',
  'Показать пантомиму «опоздал на автобус» 🚌',
  'Сказать «мяу» с пятью разными интонациями 🐱',
  'Нарисовать портрет победителя и показать его в чате 🎨',
  'Придумать рифму к слову «корова» и прочитать вслух 📝',
  'Сделать 5 прыжков и прокричать «Я — легенда!» 🦘',
  'Рассказать о самом неловком моменте в жизни (можно коротко) 😅',
  'Изобразить диктора и торжественно объявить победителя 🎙️',
  'Прокричать: «Я — чемпион по быкам и коровам!» 🏆',
] as const;

export type JoinRoomError = 'not_found' | 'finished';

export interface JoinRoomResult {
  room: OnlineRoom | null;
  error: JoinRoomError | null;
}

export interface RoomOutcome {
  ranked: RoomPlayer[];
  winner: RoomPlayer | null;
  loser: RoomPlayer | null;
  forfeit: string | null;
  allFinished: boolean;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Имя игрока в том виде, в котором оно хранится в Supabase. */
export function normalizePlayerName(name: string): string {
  return name.replace(/[@\s]/g, '').slice(0, 30) || 'Player';
}

export function isRoomComplete(players: RoomPlayer[]): boolean {
  return players.length > 0 && players.every((player) => player.finished);
}

export async function createRoom(
  hostName: string,
  digits: number,
  secret: string
): Promise<OnlineRoom | null> {
  const host = normalizePlayerName(hostName);

  // Код комнаты короткий, поэтому возможны коллизии — пробуем несколько раз
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();

    const { data: room, error } = await supabase
      .from('online_rooms')
      .insert({
        code,
        host_name: host,
        digits,
        secret,
        status: 'waiting',
      })
      .select('id, code, host_name, digits, secret, status')
      .maybeSingle();

    if (error || !room) {
      if (error?.code === '23505') continue; // код занят — генерируем новый
      return null;
    }

    await supabase.from('online_room_players').insert({
      room_id: room.id,
      username: host,
    });

    // Не ждём уборку: она не должна задерживать создание комнаты
    void cleanupStaleRooms();

    return {
      ...room,
      status: room.status as OnlineRoom['status'],
      players: [
        {
          username: host,
          max_bulls: 0,
          max_cows: 0,
          total_attempts: 0,
          finished: false,
          attempts: 0,
        },
      ],
    };
  }

  return null;
}

export async function joinRoom(code: string, playerName: string): Promise<JoinRoomResult> {
  const name = normalizePlayerName(playerName);
  const upperCode = code.toUpperCase().trim();

  const { data: room, error } = await supabase
    .from('online_rooms')
    .select('id, code, host_name, digits, secret, status')
    .eq('code', upperCode)
    .maybeSingle();

  if (error || !room) return { room: null, error: 'not_found' };

  const existingPlayers = await fetchPlayers(room.id);
  let status = room.status as OnlineRoom['status'];

  // Если все уже отгадали, а статус ещё не обновился — закрываем комнату
  if (status !== 'finished' && isRoomComplete(existingPlayers)) {
    status = 'finished';
    await setRoomStatus(room.id, 'finished');
  }

  if (status === 'finished') return { room: null, error: 'finished' };

  await supabase
    .from('online_room_players')
    .upsert(
      { room_id: room.id, username: name },
      { onConflict: 'room_id,username' }
    );

  const players = await fetchPlayers(room.id);
  return {
    room: {
      ...room,
      status,
      players,
    },
    error: null,
  };
}

export async function getRoom(code: string): Promise<OnlineRoom | null> {
  const upperCode = code.toUpperCase().trim();

  const { data: room, error } = await supabase
    .from('online_rooms')
    .select('id, code, host_name, digits, secret, status')
    .eq('code', upperCode)
    .maybeSingle();

  if (error || !room) return null;

  const players = await fetchPlayers(room.id);
  let status = room.status as OnlineRoom['status'];

  // Комната закрывается автоматически, как только все отгадали.
  if (status !== 'finished' && isRoomComplete(players)) {
    status = 'finished';
    void setRoomStatus(room.id, 'finished');
  }

  return {
    ...room,
    status,
    players,
  };
}

async function fetchPlayers(roomId: string): Promise<RoomPlayer[]> {
  const { data, error } = await supabase
    .from('online_room_players')
    .select('username, max_bulls, max_cows, total_attempts, finished, attempts')
    .eq('room_id', roomId);

  if (error || !data) return [];
  return data;
}

export async function updatePlayerProgress(
  roomId: string,
  username: string,
  maxBulls: number,
  maxCows: number,
  totalAttempts: number,
  finished: boolean,
  finalAttempts: number
): Promise<void> {
  const name = normalizePlayerName(username);

  await supabase
    .from('online_room_players')
    .upsert(
      {
        room_id: roomId,
        username: name,
        max_bulls: maxBulls,
        max_cows: maxCows,
        total_attempts: totalAttempts,
        finished,
        attempts: finalAttempts,
      },
      { onConflict: 'room_id,username' }
    );
}

export async function setRoomStatus(
  roomId: string,
  status: 'waiting' | 'playing' | 'finished'
): Promise<void> {
  await supabase
    .from('online_rooms')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', roomId);
}

export async function finishRoomIfComplete(room: OnlineRoom): Promise<boolean> {
  if (room.status === 'finished') return true;
  if (!isRoomComplete(room.players)) return false;
  await setRoomStatus(room.id, 'finished');
  return true;
}

export async function deleteRoom(roomId: string): Promise<void> {
  await supabase.from('online_rooms').delete().eq('id', roomId);
}

/**
 * Убирает брошенные комнаты. Вызывается при открытии приложения и создании
 * новой комнаты — отдельная cron-задача для этого не нужна.
 */
export async function cleanupStaleRooms(): Promise<void> {
  const now = Date.now();
  const olderThan = (ms: number) => new Date(now - ms).toISOString();

  try {
    // Совсем старые комнаты в любом статусе
    await supabase
      .from('online_rooms')
      .delete()
      .lt('created_at', olderThan(24 * 60 * 60 * 1000));

    // Брошенные комнаты, которые так и не начали игру
    await supabase
      .from('online_rooms')
      .delete()
      .eq('status', 'waiting')
      .lt('created_at', olderThan(6 * 60 * 60 * 1000));

    // Завершённые комнаты, которые уже никто не смотрит
    await supabase
      .from('online_rooms')
      .delete()
      .eq('status', 'finished')
      .lt('updated_at', olderThan(12 * 60 * 60 * 1000));
  } catch {
    /* уборка не должна мешать игре */
  }
}

/**
 * Итоговое ранжирование:
 * 1. Сначала те, кто отгадал, — по возрастанию числа попыток.
 * 2. Затем те, кто не отгадал, — по лучшему результату (быки, коровы).
 * Последний в списке получает фант.
 */
export function rankPlayers(players: RoomPlayer[]): RoomPlayer[] {
  return [...players].sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;

    if (a.finished && b.finished) {
      if (a.attempts !== b.attempts) return a.attempts - b.attempts;
    } else {
      if (b.max_bulls !== a.max_bulls) return b.max_bulls - a.max_bulls;
      if (b.max_cows !== a.max_cows) return b.max_cows - a.max_cows;
      if (a.total_attempts !== b.total_attempts) {
        return a.total_attempts - b.total_attempts;
      }
    }

    return a.username.localeCompare(b.username, 'ru');
  });
}

/** Один и тот же фант на всех устройствах — без хранения в базе. */
export function pickForfeit(roomId: string, loserName: string): string {
  const key = `${roomId}|${loserName}`;
  let hash = 2166136261;

  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return FORFEITS[(hash >>> 0) % FORFEITS.length];
}

export function getRoomOutcome(room: OnlineRoom): RoomOutcome {
  const ranked = rankPlayers(room.players);
  const allFinished = isRoomComplete(room.players);
  const winner = ranked.find((player) => player.finished) ?? null;
  const loser = ranked.length > 1 ? ranked[ranked.length - 1] : null;
  const forfeit =
    room.status === 'finished' && loser
      ? pickForfeit(room.id, loser.username)
      : null;

  return { ranked, winner, loser, forfeit, allFinished };
}
