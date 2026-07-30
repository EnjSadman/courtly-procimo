import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { addDays } from "date-fns";
import { AppError } from "@/errors/AppError";

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function assertValidTimeZone(timeZone: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    throw new AppError(400, "Invalid timezone.");
  }
}

export function formatDateInTimeZone(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
}

export function addCalendarDays(dateString: string, days: number) {
  const match = datePattern.exec(dateString);
  if (!match) {
    throw new AppError(400, "Date must use YYYY-MM-DD format.");
  }

  const base = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  const result = addDays(base, days);
  return formatInTimeZone(result, "UTC", "yyyy-MM-dd");
}

export function zonedDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
) {
  if (!datePattern.test(date) || !timePattern.test(time)) {
    throw new AppError(400, "Invalid date or time.");
  }

  return fromZonedTime(`${date} ${time}`, timeZone);
}

export function localDayRangeToUtc(date: string, timeZone: string) {
  const start = zonedDateTimeToUtc(date, "00:00", timeZone);
  const end = zonedDateTimeToUtc(addCalendarDays(date, 1), "00:00", timeZone);
  return { start, end };
}

export function localDateRangeToUtc(
  from: string,
  to: string,
  timeZone: string,
) {
  const start = zonedDateTimeToUtc(from, "00:00", timeZone);
  const end = zonedDateTimeToUtc(addCalendarDays(to, 1), "00:00", timeZone);
  return { start, end };
}

export function isPastZonedDateTime(
  date: string,
  time: string,
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

  const currentTime = formatInTimeZone(now, timeZone, "HH:mm");
  const slotHour = Number(time.slice(0, 2));
  const slotMinute = Number(time.slice(3, 5));
  const currentHour = Number(currentTime.slice(0, 2));
  const currentMinute = Number(currentTime.slice(3, 5));

  return currentHour * 60 + currentMinute >= slotHour * 60 + slotMinute;
}

const CANCEL_LEAD_MS = 2 * 60 * 60 * 1000;

export function canCancelStartsAt(startsAt: Date, now = new Date()) {
  return startsAt.getTime() - now.getTime() > CANCEL_LEAD_MS;
}
