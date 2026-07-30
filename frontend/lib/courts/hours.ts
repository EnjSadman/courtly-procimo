export function formatUtcDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

export function parseHour(time: string) {
  const [hour] = time.split(":").map(Number);
  return hour;
}

export function buildHourSlots(openTime: string, closeTime: string) {
  const openHour = parseHour(openTime);
  const closeHour = parseHour(closeTime);
  const slots: string[] = [];

  for (let hour = openHour; hour < closeHour; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
  }

  return slots;
}

export function toSlotStartsAt(date: string, hour: string) {
  return `${date}T${hour}:00.000Z`;
}

export function occupiedSlotKey(courtId: string, startsAt: string) {
  return `${courtId}:${startsAt}`;
}

export function formatDayLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
