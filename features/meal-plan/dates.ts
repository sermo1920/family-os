/** Minuit UTC du lundi de la semaine contenant `date`. */
export function getWeekStart(date: Date): Date {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utcDate.getUTCDay(); // 0 = dimanche
  const diffToMonday = day === 0 ? -6 : 1 - day;
  utcDate.setUTCDate(utcDate.getUTCDate() + diffToMonday);
  return utcDate;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Clé stable "aaaa-mm-jj" pour comparer/indexer des dates jour-seul. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
