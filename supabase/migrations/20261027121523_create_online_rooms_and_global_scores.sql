/*
# Create online game rooms and global leaderboard (no-auth, public)

## What this does
Adds two new tables for the online multiplayer mode and a global leaderboard,
without requiring user accounts. The Telegram WebApp provides the player's
nickname, which is used as the identity in both tables.

## New Tables

### global_scores
- `id` (uuid, PK)
- `username` (text, unique) — the Telegram nickname, used as the player identity
- `score` (integer, default 0) — cumulative points across all wins
- `wins` (integer, default 0) — number of wins
- `updated_at` (timestamptz) — last time the score changed

### online_rooms
- `id` (uuid, PK)
- `code` (text, unique) — 6-character room code that players share to join
- `host_name` (text) — the nickname of the room creator
- `digits` (integer) — number of digits for the secret number
- `secret` (text) — the secret number for this room
- `status` (text, default 'waiting') — 'waiting' | 'playing' | 'finished'
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### online_room_players
- `id` (uuid, PK)
- `room_id` (uuid, FK → online_rooms, cascade delete)
- `username` (text) — the player's nickname
- `max_bulls` (integer, default 0) — best bulls count this match
- `max_cows` (integer, default 0) — best cows count this match
- `total_attempts` (integer, default 0) — total guesses made
- `finished` (boolean, default false) — whether this player guessed the number
- `attempts` (integer, default 0) — attempts when finished (0 if not)
- `joined_at` (timestamptz)
- Unique constraint on (room_id, username) so each player joins a room once

## Security
- All three tables use RLS with `TO anon, authenticated` and `USING (true)` / `WITH CHECK (true)`
  because this is a no-auth app — the frontend uses the anon key and there are no sign-in screens.
  The data is intentionally public/shared (global leaderboard, multiplayer rooms).
- Grants: SELECT, INSERT, UPDATE, DELETE to anon + authenticated on all tables.

## Important notes
1. No user_id columns, no auth.uid() references — this is a no-auth app.
2. The `global_scores` table has a unique constraint on `username` so upserts
   (ON CONFLICT) can atomically add points to an existing player's score.
3. The `online_room_players` table has a unique constraint on (room_id, username)
   so a player can't join the same room twice.
4. Indexes on `online_rooms.code` (for room lookups) and `global_scores.score`
   (for leaderboard ordering) are created.
*/

CREATE TABLE IF NOT EXISTS global_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  score integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE global_scores ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON global_scores TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_global_scores" ON global_scores;
CREATE POLICY "anon_select_global_scores" ON global_scores FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_global_scores" ON global_scores;
CREATE POLICY "anon_insert_global_scores" ON global_scores FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_global_scores" ON global_scores;
CREATE POLICY "anon_update_global_scores" ON global_scores FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_global_scores" ON global_scores;
CREATE POLICY "anon_delete_global_scores" ON global_scores FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_global_scores_score ON global_scores (score DESC);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS online_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  host_name text NOT NULL,
  digits integer NOT NULL DEFAULT 4,
  secret text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE online_rooms ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON online_rooms TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_online_rooms" ON online_rooms;
CREATE POLICY "anon_select_online_rooms" ON online_rooms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_online_rooms" ON online_rooms;
CREATE POLICY "anon_insert_online_rooms" ON online_rooms FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_online_rooms" ON online_rooms;
CREATE POLICY "anon_update_online_rooms" ON online_rooms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_online_rooms" ON online_rooms;
CREATE POLICY "anon_delete_online_rooms" ON online_rooms FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_online_rooms_code ON online_rooms (code);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS online_room_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES online_rooms(id) ON DELETE CASCADE,
  username text NOT NULL,
  max_bulls integer NOT NULL DEFAULT 0,
  max_cows integer NOT NULL DEFAULT 0,
  total_attempts integer NOT NULL DEFAULT 0,
  finished boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, username)
);

ALTER TABLE online_room_players ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON online_room_players TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_online_room_players" ON online_room_players;
CREATE POLICY "anon_select_online_room_players" ON online_room_players FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_online_room_players" ON online_room_players;
CREATE POLICY "anon_insert_online_room_players" ON online_room_players FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_online_room_players" ON online_room_players;
CREATE POLICY "anon_update_online_room_players" ON online_room_players FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_online_room_players" ON online_room_players;
CREATE POLICY "anon_delete_online_room_players" ON online_room_players FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_online_room_players_room ON online_room_players (room_id);
