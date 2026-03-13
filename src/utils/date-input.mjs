function endOfDay(date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function fromDateParts(dateString) {
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return endOfDay(new Date(year, month, day));
}

export function parseDateInput(input, nowProvider = () => new Date()) {
  if (!input) {
    return null;
  }

  const normalized = input.toLowerCase().trim();
  if (normalized === 'none' || normalized === 'clear') {
    return null;
  }

  const now = nowProvider();

  if (normalized === 'today') {
    return endOfDay(now);
  }

  if (normalized === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return endOfDay(tomorrow);
  }

  if (normalized === 'next week') {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return endOfDay(nextWeek);
  }

  const plusDaysMatch = normalized.match(/^\+(\d+)\s*(d|day|days)?$/);
  if (plusDaysMatch) {
    const future = new Date(now);
    future.setDate(future.getDate() + Number(plusDaysMatch[1]));
    return endOfDay(future);
  }

  const weekdayMatch = normalized.match(/^(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (weekdayMatch) {
    const weekdays = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const targetDay = weekdays.indexOf(weekdayMatch[2]);
    const target = new Date(now);
    let daysToAdd = targetDay - target.getDay();
    if (daysToAdd <= 0 || weekdayMatch[1]) {
      daysToAdd += 7;
    }
    target.setDate(target.getDate() + daysToAdd);
    return endOfDay(target);
  }

  const dateOnly = fromDateParts(input);
  if (dateOnly) {
    return dateOnly;
  }

  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  throw new Error(`Could not parse date: "${input}"`);
}
