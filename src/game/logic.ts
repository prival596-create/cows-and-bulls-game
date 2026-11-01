export type GameMode = 'solo' | 'online';

export interface GuessResult {
  guess: string;
  bulls: number;
  cows: number;
}

export function generateSecret(digits: number): string {
  const pool = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const secret: string[] = [];
  for (let i = 0; i < digits; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    secret.push(pool.splice(idx, 1)[0]);
  }
  return secret.join('');
}

export function evaluateGuess(secret: string, guess: string): GuessResult {
  let bulls = 0;
  let cows = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) {
      bulls++;
    } else if (secret.includes(guess[i])) {
      cows++;
    }
  }
  return { guess, bulls, cows };
}

export function hasUniqueDigits(input: string): boolean {
  return new Set(input).size === input.length;
}

export function isValidGuess(input: string, digits: number): boolean {
  if (input.length !== digits) return false;
  if (!/^\d+$/.test(input)) return false;
  return hasUniqueDigits(input);
}
