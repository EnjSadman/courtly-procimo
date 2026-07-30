"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addUtcDays,
  buildHourSlots,
  formatDayLabel,
  occupiedSlotKey,
  toSlotStartsAt,
} from "@/lib/courts/hours";

export type SelectedSlot = {
  date: string;
  hour: string;
};

type CourtAvailabilityPanelProps = {
  courtId: string;
  openTime: string;
  closeTime: string;
  date: string;
  today: string;
  onDateChange: (date: string) => void;
  occupiedKeys: Set<string>;
  selectable?: boolean;
  selectedSlots?: SelectedSlot[];
  onToggleSlot?: (slot: SelectedSlot) => void;
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
  openTime,
  closeTime,
  date,
  today,
  onDateChange,
  occupiedKeys,
  selectable = false,
  selectedSlots = [],
  onToggleSlot,
  isLoading = false,
}: CourtAvailabilityPanelProps) {
  const hours = buildHourSlots(openTime, closeTime);
  const daySlots = selectedSlots.filter((slot) => slot.date === date);

  return (
    <div className="space-y-3 px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous day"
            onClick={() => onDateChange(addUtcDays(date, -1))}
          >
            <ChevronLeft />
          </Button>
          <p className="min-w-36 text-center text-sm font-medium text-foreground">
            {formatDayLabel(date)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next day"
            onClick={() => onDateChange(addUtcDays(date, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={date === today}
          onClick={() => onDateChange(today)}
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
          const startsAt = toSlotStartsAt(date, hour);
          const occupied = occupiedKeys.has(
            occupiedSlotKey(courtId, startsAt),
          );
          const selected = daySlots.some((slot) => slot.hour === hour);
          const interactive = selectable && !occupied;
          const slotClassName = cn(
            "flex h-10 min-w-14 items-center justify-center rounded-md border border-border px-2 text-xs font-medium text-accent-ink transition-colors",
            occupied
              ? "bg-destructive text-white"
              : selected
                ? "bg-slot-selected"
                : "bg-white",
            interactive
              ? "cursor-pointer hover:opacity-90"
              : "cursor-default",
          );
          const label = `${hour} on ${date}${occupied ? ", occupied" : ""}${selected ? ", selected" : ""}`;

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
              aria-pressed={selected}
              aria-label={label}
              onClick={() => onToggleSlot?.({ date, hour })}
              className={slotClassName}
            >
              {hour}
            </button>
          );
        })}
      </div>
    </div>
  );
}
