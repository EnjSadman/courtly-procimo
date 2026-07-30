export function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function formatDateInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addCalendarDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getZonedParts(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function getTimeZoneOffsetMs(utcDate: Date, timeZone: string) {
  const parts = getZonedParts(utcDate, timeZone);
  const asLocal = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return asLocal - utcDate.getTime();
}

export function zonedDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
) {
  const wallAsUtc = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    Number(time.slice(0, 2)),
    Number(time.slice(3, 5)),
    0,
    0,
  );

  let utcMillis = wallAsUtc;
  for (let index = 0; index < 2; index += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcMillis), timeZone);
    utcMillis = wallAsUtc - offset;
  }

  return new Date(utcMillis);
}

export function parseHour(time: string) {
  const [hour] = time.split(":").map(Number);
  return hour ?? 0;
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

export function toSlotStartsAt(date: string, hour: string, timeZone: string) {
  return zonedDateTimeToUtc(date, hour, timeZone).toISOString();
}

export function isPastSlot(
  date: string,
  hour: string,
  timeZone: string,
  now = new Date(),
) {
  const today = formatDateInTimeZone(now, timeZone);
  if (date < today) {
    return true;
  }
  if (date > today) {
    return false;
  }

  const parts = getZonedParts(now, timeZone);
  const slotMinutes = parseHour(hour) * 60;
  const nowMinutes = parts.hour * 60 + parts.minute;
  return nowMinutes >= slotMinutes;
}

const CANCEL_LEAD_MS = 2 * 60 * 60 * 1000;

export function canCancelSlot(
  date: string,
  hour: string,
  timeZone: string,
  now = new Date(),
) {
  const startsAt = zonedDateTimeToUtc(date, hour, timeZone);
  return startsAt.getTime() - now.getTime() > CANCEL_LEAD_MS;
}

export function occupiedSlotKey(courtId: string, startsAt: string) {
  return `${courtId}:${startsAt}`;
}

export function formatDayLabel(dateString: string, timeZone: string) {
  const noonUtc = zonedDateTimeToUtc(dateString, "12:00", timeZone);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(noonUtc);
}
