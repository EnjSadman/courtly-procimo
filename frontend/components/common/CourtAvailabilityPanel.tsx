"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addCalendarDays,
  buildHourSlots,
  formatDayLabel,
  isPastSlot,
  occupiedSlotKey,
  toSlotStartsAt,
} from "@/lib/courts/hours";
import type { MineSlot } from "@/lib/api/bookings";

export type SelectedSlot = {
  date: string;
  hour: string;
};

type CourtAvailabilityPanelProps = {
  courtId: string;
  timezone: string;
  openTime: string;
  closeTime: string;
  date: string;
  today: string;
  onDateChange: (date: string) => void;
  occupiedKeys: Set<string>;
  mineSlots?: MineSlot[];
  selectable?: boolean;
  selectedSlots?: SelectedSlot[];
  selectedMineBookingId?: string | null;
  onToggleSlot?: (slot: SelectedSlot) => void;
  onSelectMineSlot?: (slot: MineSlot | null) => void;
  onBookSlots?: (slots: SelectedSlot[]) => void;
  onCancelBooking?: (bookingId: string) => void;
  isBooking?: boolean;
  isCancelling?: boolean;
  actionError?: string;
  isLoading?: boolean;
};

function areConsecutive(a: SelectedSlot, b: SelectedSlot) {
  if (a.date !== b.date) {
    return false;
  }

  const hourA = Number(a.hour.slice(0, 2));
  const hourB = Number(b.hour.slice(0, 2));
  return Math.abs(hourA - hourB) === 1;
}

export function nextSelectedSlots(
  current: SelectedSlot[],
  clicked: SelectedSlot,
): SelectedSlot[] {
  const alreadySelected = current.some(
    (slot) => slot.date === clicked.date && slot.hour === clicked.hour,
  );

  if (alreadySelected) {
    return current.filter(
      (slot) => !(slot.date === clicked.date && slot.hour === clicked.hour),
    );
  }

  if (current.length === 0) {
    return [clicked];
  }

  if (current.length === 1 && areConsecutive(current[0], clicked)) {
    return [...current, clicked].sort((left, right) =>
      left.hour.localeCompare(right.hour),
    );
  }

  return [clicked];
}

export function CourtAvailabilityPanel({
  courtId,
  timezone,
  openTime,
  closeTime,
  date,
  today,
  onDateChange,
  occupiedKeys,
  mineSlots = [],
  selectable = false,
  selectedSlots = [],
  selectedMineBookingId = null,
  onToggleSlot,
  onSelectMineSlot,
  onBookSlots,
  onCancelBooking,
  isBooking = false,
  isCancelling = false,
  actionError = "",
  isLoading = false,
}: CourtAvailabilityPanelProps) {
  const hours = buildHourSlots(openTime, closeTime);
  const daySlots = selectedSlots.filter((slot) => slot.date === date);
  const canGoPrevious = date > today;
  const showBookButton = selectable && daySlots.length > 0 && !selectedMineBookingId;
  const selectedMine = mineSlots.find(
    (slot) => slot.bookingId === selectedMineBookingId,
  );
  const showCancelButton = selectable && Boolean(selectedMine);
  const cancelAllowed = selectedMine
    ? new Date(selectedMine.bookingStartsAt).getTime() - Date.now() >
      2 * 60 * 60 * 1000
    : false;

  const mineByStartsAt = new Map(
    mineSlots.map((slot) => [slot.startsAt, slot]),
  );

  function goToDate(nextDate: string) {
    if (nextDate < today) {
      onDateChange(today);
      return;
    }
    onDateChange(nextDate);
  }

  return (
    <div className="space-y-3 px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous day"
            disabled={!canGoPrevious}
            onClick={() => goToDate(addCalendarDays(date, -1))}
          >
            <ChevronLeft />
          </Button>
          <p className="min-w-36 text-center text-sm font-medium text-foreground">
            {formatDayLabel(date, timezone)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next day"
            onClick={() => goToDate(addCalendarDays(date, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={date === today}
          onClick={() => goToDate(today)}
        >
          Today
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading availability…
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {hours.map((hour) => {
          const startsAt = toSlotStartsAt(date, hour, timezone);
          const key = occupiedSlotKey(courtId, startsAt);
          const mine = mineByStartsAt.get(startsAt);
          const occupied = occupiedKeys.has(key);
          const past = isPastSlot(date, hour, timezone);
          const selected = daySlots.some((slot) => slot.hour === hour);
          const mineSelected = Boolean(
            mine && mine.bookingId === selectedMineBookingId,
          );
          const canSelectFree = selectable && !occupied && !mine && !past;
          const canSelectMine = selectable && Boolean(mine);
          const interactive = canSelectFree || canSelectMine;
          const slotClassName = cn(
            "flex h-10 min-w-14 items-center justify-center rounded-md border border-border px-2 text-xs font-medium transition-colors",
            mine
              ? mineSelected
                ? "bg-slot-mine text-accent-ink ring-2 ring-accent"
                : "bg-slot-mine text-accent-ink"
              : occupied
                ? "bg-destructive text-white"
                : past
                  ? "bg-slot-past text-muted-foreground"
                  : selected
                    ? "bg-slot-selected text-accent-ink"
                    : "bg-white text-accent-ink",
            interactive
              ? "cursor-pointer hover:opacity-90"
              : "cursor-default",
          );
          const label = `${hour} on ${date}${mine ? ", your booking" : ""}${occupied ? ", occupied" : ""}${past ? ", past" : ""}${selected || mineSelected ? ", selected" : ""}`;

          if (!interactive) {
            return (
              <div key={startsAt} aria-label={label} className={slotClassName}>
                {hour}
              </div>
            );
          }

          return (
            <button
              key={startsAt}
              type="button"
              aria-pressed={selected || mineSelected}
              aria-label={label}
              onClick={() => {
                if (mine) {
                  onSelectMineSlot?.(
                    mine.bookingId === selectedMineBookingId ? null : mine,
                  );
                  return;
                }
                onSelectMineSlot?.(null);
                onToggleSlot?.({ date, hour });
              }}
              className={slotClassName}
            >
              {hour}
            </button>
          );
        })}
      </div>

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {showBookButton ? (
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            size="sm"
            disabled={isBooking}
            onClick={() => onBookSlots?.(daySlots)}
          >
            {isBooking ? "Booking…" : "Book slot"}
          </Button>
        </div>
      ) : null}

      {showCancelButton && selectedMine ? (
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isCancelling || !cancelAllowed}
            title={
              cancelAllowed
                ? undefined
                : "Cancellations require more than 2 hours before the booking starts."
            }
            onClick={() => onCancelBooking?.(selectedMine.bookingId)}
          >
            {isCancelling ? "Cancelling…" : "Cancel booking"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
