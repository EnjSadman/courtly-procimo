import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { addDays } from "date-fns";

export function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function formatDateInTimeZone(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
}

export function addCalendarDays(dateString: string, days: number) {
  const base = new Date(`${dateString}T00:00:00.000Z`);
  const result = addDays(base, days);
  return formatInTimeZone(result, "UTC", "yyyy-MM-dd");
}

export function zonedDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
) {
  return fromZonedTime(`${date} ${time}`, timeZone);
}

export function buildHourSlots(openTime: string, closeTime: string) {
  const openHour = parseInt(openTime, 10);
  const closeHour = parseInt(closeTime, 10);
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
  if (date < today) return true;
  if (date > today) return false;

  const currentTime = formatInTimeZone(now, timeZone, "HH:mm");
  const slotMinutes = parseInt(hour, 10) * 60;
  const currentMinutes =
    parseInt(currentTime.slice(0, 2), 10) * 60 +
    parseInt(currentTime.slice(3, 5), 10);

  return currentMinutes >= slotMinutes;
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
