import { supabase } from '@/lib/supabase';

export interface GlobalScore {
  username: string;
  score: number;
  wins: number;
}

function cleanName(username: string): string {
  return username.replace(/[@\s]/g, '').slice(0, 30);
}

export async function addScoreToGlobal(username: string, points: number): Promise<void> {
  const name = cleanName(username);
  if (!name) return;

  const { data: existing } = await supabase
    .from('global_scores')
    .select('score, wins')
    .eq('username', name)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('global_scores')
      .update({
        score: existing.score + points,
        wins: existing.wins + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('username', name);
  } else {
    await supabase
      .from('global_scores')
      .upsert(
        { username: name, score: points, wins: 1 },
        { onConflict: 'username', ignoreDuplicates: true }
      );
  }
}

export interface LeaderboardResult {
  entries: GlobalScore[];
  error: boolean;
}

export async function getGlobalLeaderboard(limit = 10): Promise<LeaderboardResult> {
  const { data, error } = await supabase
    .from('global_scores')
    .select('username, score, wins')
    .order('score', { ascending: false })
    .limit(limit);

  if (error || !data) return { entries: [], error: true };
  return { entries: data, error: false };
}

export function calculateWinScore(difficulty: number, attempts: number): number {
  return Math.max(10, difficulty * 100 - attempts * 10);
}
