/** 로컬 타임존 기준 YYYY-MM-DD */
export function todayDateString(): string {
  return toDateString(new Date());
}

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function yesterdayDateString(from: string): string {
  const [year, month, day] = from.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return toDateString(date);
}
