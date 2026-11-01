export function difficultyLabel(n: number): string {
  if (n <= 3) return 'Детский / Для новичков 👶';
  if (n === 4) return 'Любитель 🔎';
  if (n === 5) return 'Продвинутый 🎯';
  if (n === 6) return 'Эксперт 🧠';
  if (n === 7) return 'Мастер 👑';
  if (n === 8) return 'Гений логики 🚀';
  if (n === 9) return 'Легенда 🔥';
  return 'Абсолют 🧨';
}

/** «2 цифры», «4 цифры», «5 цифр» — правильное склонение. */
export function digitsLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'цифра';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'цифры';
  return 'цифр';
}
