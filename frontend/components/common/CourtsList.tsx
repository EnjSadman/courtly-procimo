"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CourtForm } from "@/components/admin/CourtForm";
import {
  CourtAvailabilityPanel,
  nextSelectedSlots,
  type SelectedSlot,
} from "@/components/common/CourtAvailabilityPanel";
import {
  cancelBooking,
  createBooking,
  listOccupiedSlots,
  type MineSlot,
  type OccupiedSlotsResponse,
} from "@/lib/api/bookings";
import {
  listCourts,
  updateCourt,
  type CourtListItem,
} from "@/lib/api/courts";
import { queryKeys } from "@/lib/api/queryKeys";
import {
  addCalendarDays,
  formatDateInTimeZone,
  occupiedSlotKey,
} from "@/lib/courts/hours";
import { cn } from "@/lib/utils";

type CourtsListProps = {
  editable?: boolean;
};

const AVAILABILITY_STALE_MS = 60_000;

function formatPrice(hourlyPrice: string) {
  const amount = Number(hourlyPrice);
  if (Number.isNaN(amount)) {
    return hourlyPrice;
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function toSlotKeys(
  slots: Array<{ courtId: string; startsAt: string }> = [],
) {
  return slots.map((slot) => occupiedSlotKey(slot.courtId, slot.startsAt));
}

function courtToday(court: CourtListItem) {
  return formatDateInTimeZone(new Date(), court.timezone);
}

export function CourtsList({ editable = false }: CourtsListProps) {
  const queryClient = useQueryClient();
  const [editingCourt, setEditingCourt] = useState<CourtListItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState("");
  const [expandedCourtId, setExpandedCourtId] = useState<string | null>(null);
  const [viewDateByCourt, setViewDateByCourt] = useState<
    Record<string, string>
  >({});
  const [selectedByCourt, setSelectedByCourt] = useState<
    Record<string, SelectedSlot[]>
  >({});
  const [selectedMineByCourt, setSelectedMineByCourt] = useState<
    Record<string, string | null>
  >({});
  const [bookError, setBookError] = useState("");

  const { data, error, isLoading } = useQuery({
    queryKey: queryKeys.courts,
    queryFn: listCourts,
  });

  const courts = useMemo(() => {
    const all = data?.courts ?? [];
    return editable ? all : all.filter((court) => court.isActive);
  }, [data?.courts, editable]);
  const expandedCourt =
    courts.find((court) => court.id === expandedCourtId) ?? null;
  const expandedToday = expandedCourt ? courtToday(expandedCourt) : null;
  const viewDate =
    (expandedCourtId ? viewDateByCourt[expandedCourtId] : undefined) ??
    expandedToday;

  const todayGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const court of courts) {
      const date = courtToday(court);
      const ids = groups.get(date) ?? [];
      ids.push(court.id);
      groups.set(date, ids);
    }
    return [...groups.entries()];
  }, [courts]);

  const prefetchCourtDay = useCallback(
    (courtId: string, date: string) => {
      return queryClient.prefetchQuery({
        queryKey: queryKeys.occupiedSlots(date, date, [courtId]),
        queryFn: () =>
          listOccupiedSlots({
            date,
            courtIds: [courtId],
          }),
        staleTime: AVAILABILITY_STALE_MS,
      });
    },
    [queryClient],
  );

  const todayQueries = useQueries({
    queries: todayGroups.map(([date, courtIds]) => ({
      queryKey: queryKeys.occupiedSlots(date, date, courtIds),
      queryFn: () =>
        listOccupiedSlots({
          date,
          courtIds,
        }),
      staleTime: AVAILABILITY_STALE_MS,
      refetchOnMount: "always" as const,
    })),
  });

  const viewDayAvailabilityQuery = useQuery({
    queryKey: queryKeys.occupiedSlots(
      viewDate ?? "",
      viewDate ?? "",
      expandedCourtId ? [expandedCourtId] : [],
    ),
    queryFn: () =>
      listOccupiedSlots({
        date: viewDate!,
        courtIds: expandedCourtId ? [expandedCourtId] : [],
      }),
    enabled:
      Boolean(expandedCourtId) &&
      Boolean(viewDate) &&
      Boolean(expandedToday) &&
      viewDate !== expandedToday,
    staleTime: AVAILABILITY_STALE_MS,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (!expandedCourtId || !expandedToday) {
      return;
    }

    for (const offset of [1, 2, 3]) {
      void prefetchCourtDay(
        expandedCourtId,
        addCalendarDays(expandedToday, offset),
      );
    }
  }, [expandedCourtId, expandedToday, prefetchCourtDay]);

  useEffect(() => {
    if (!expandedCourtId || !viewDate) {
      return;
    }

    void prefetchCourtDay(expandedCourtId, addCalendarDays(viewDate, -1));
    void prefetchCourtDay(expandedCourtId, addCalendarDays(viewDate, 1));
  }, [expandedCourtId, viewDate, prefetchCourtDay]);

  const statusMutation = useMutation({
    mutationFn: ({
      courtId,
      isActive,
    }: {
      courtId: string;
      isActive: boolean;
    }) => updateCourt(courtId, { isActive }),
    onSuccess: async () => {
      setActionError("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.courts });
    },
    onError: (mutationError) => {
      setActionError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to update court status.",
      );
    },
  });

  const showForm = editable && (isCreating || editingCourt !== null);

  const cachedViewDay =
    expandedCourtId && viewDate && viewDate !== expandedToday
      ? queryClient.getQueryData<OccupiedSlotsResponse>(
          queryKeys.occupiedSlots(viewDate, viewDate, [expandedCourtId]),
        )
      : undefined;

  const occupiedKeys = new Set([
    ...todayQueries.flatMap((query) => toSlotKeys(query.data?.occupied)),
    ...toSlotKeys(
      (viewDayAvailabilityQuery.data ?? cachedViewDay)?.occupied,
    ),
  ]);

  const mineSlots = [
    ...todayQueries.flatMap((query) => query.data?.mine ?? []),
    ...((viewDayAvailabilityQuery.data ?? cachedViewDay)?.mine ?? []),
  ];

  const todayPending = todayQueries.some(
    (query) => query.isPending && !query.data,
  );
  const availabilityPending =
    viewDate && expandedToday && viewDate === expandedToday
      ? todayPending
      : viewDayAvailabilityQuery.isPending &&
        !viewDayAvailabilityQuery.data &&
        !cachedViewDay;

  const bookMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: async (_result, variables) => {
      setBookError("");
      setSelectedByCourt((current) => ({
        ...current,
        [variables.courtId]: [],
      }));
      setSelectedMineByCourt((current) => ({
        ...current,
        [variables.courtId]: null,
      }));
      await queryClient.invalidateQueries({
        queryKey: ["bookings", "occupied"],
      });
    },
    onError: (mutationError) => {
      setBookError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to create booking.",
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: async () => {
      setBookError("");
      if (expandedCourtId) {
        setSelectedMineByCourt((current) => ({
          ...current,
          [expandedCourtId]: null,
        }));
      }
      await queryClient.invalidateQueries({
        queryKey: ["bookings", "occupied"],
      });
    },
    onError: (mutationError) => {
      setBookError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to cancel booking.",
      );
    },
  });

  function toggleExpanded(court: CourtListItem) {
    setExpandedCourtId((current) => {
      if (current === court.id) {
        return null;
      }

      const today = courtToday(court);
      setViewDateByCourt((dates) => ({
        ...dates,
        [court.id]: dates[court.id] ?? today,
      }));
      return court.id;
    });
  }

  function setViewDate(court: CourtListItem, date: string) {
    const today = courtToday(court);
    setViewDateByCourt((current) => ({
      ...current,
      [court.id]: date < today ? today : date,
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {courts.length} court{courts.length === 1 ? "" : "s"}
        </p>
        {editable ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingCourt(null);
              setIsCreating(true);
            }}
            disabled={showForm}
          >
            Add court
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <CourtForm
          court={editingCourt}
          onClose={() => {
            setIsCreating(false);
            setEditingCourt(null);
          }}
        />
      ) : null}

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading courts…
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error instanceof Error ? error.message : "Failed to load courts."}
        </p>
      ) : null}

      {!isLoading && !error && courts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {editable ? "No courts yet." : "No courts available."}
        </p>
      ) : null}

      {!isLoading && !error && courts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Sport</th>
                <th className="px-3 py-3 font-medium">Hourly price</th>
                <th className="px-3 py-3 font-medium">Opening hours</th>
                {editable ? (
                  <>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Actions</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {courts.map((court) => {
                const isExpanded = expandedCourtId === court.id;
                const today = courtToday(court);
                const courtViewDate = viewDateByCourt[court.id] ?? today;

                return (
                  <Fragment key={court.id}>
                    <tr
                      className={cn(
                        "border-b border-border last:border-b-0",
                        isExpanded ? "bg-surface" : null,
                      )}
                    >
                      <td
                        className="cursor-pointer px-3 py-3 font-medium text-foreground"
                        onClick={() => toggleExpanded(court)}
                      >
                        {court.name}
                      </td>
                      <td
                        className="cursor-pointer px-3 py-3 text-muted-foreground"
                        onClick={() => toggleExpanded(court)}
                      >
                        {court.sportType}
                      </td>
                      <td
                        className="cursor-pointer px-3 py-3 text-muted-foreground"
                        onClick={() => toggleExpanded(court)}
                      >
                        {formatPrice(court.hourlyPrice)}
                      </td>
                      <td
                        className="cursor-pointer px-3 py-3 text-muted-foreground"
                        onClick={() => toggleExpanded(court)}
                      >
                        {court.openTime}–{court.closeTime}
                      </td>
                      {editable ? (
                        <>
                          <td
                            className="cursor-pointer px-3 py-3"
                            onClick={() => toggleExpanded(court)}
                          >
                            <span
                              className={
                                court.isActive
                                  ? "text-accent"
                                  : "text-muted-foreground"
                              }
                            >
                              {court.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsCreating(false);
                                  setEditingCourt(court);
                                }}
                                disabled={showForm || statusMutation.isPending}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  court.isActive ? "destructive" : "outline"
                                }
                                size="sm"
                                onClick={() =>
                                  statusMutation.mutate({
                                    courtId: court.id,
                                    isActive: !court.isActive,
                                  })
                                }
                                disabled={showForm || statusMutation.isPending}
                              >
                                {court.isActive ? "Deactivate" : "Activate"}
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : null}
                    </tr>
                    {isExpanded ? (
                      <tr className="border-b border-border last:border-b-0">
                        <td
                          colSpan={editable ? 6 : 4}
                          className="bg-surface px-0"
                        >
                          <CourtAvailabilityPanel
                            courtId={court.id}
                            timezone={court.timezone}
                            openTime={court.openTime}
                            closeTime={court.closeTime}
                            date={courtViewDate}
                            today={today}
                            onDateChange={(date) => setViewDate(court, date)}
                            occupiedKeys={occupiedKeys}
                            mineSlots={mineSlots.filter(
                              (slot) => slot.courtId === court.id,
                            )}
                            selectable={!editable}
                            selectedSlots={selectedByCourt[court.id] ?? []}
                            selectedMineBookingId={
                              selectedMineByCourt[court.id] ?? null
                            }
                            isLoading={availabilityPending}
                            isBooking={bookMutation.isPending}
                            isCancelling={cancelMutation.isPending}
                            actionError={
                              expandedCourtId === court.id ? bookError : ""
                            }
                            onToggleSlot={(slot) => {
                              setBookError("");
                              setSelectedMineByCourt((current) => ({
                                ...current,
                                [court.id]: null,
                              }));
                              setSelectedByCourt((current) => ({
                                ...current,
                                [court.id]: nextSelectedSlots(
                                  current[court.id] ?? [],
                                  slot,
                                ),
                              }));
                            }}
                            onSelectMineSlot={(slot: MineSlot | null) => {
                              setBookError("");
                              setSelectedByCourt((current) => ({
                                ...current,
                                [court.id]: [],
                              }));
                              setSelectedMineByCourt((current) => ({
                                ...current,
                                [court.id]: slot?.bookingId ?? null,
                              }));
                            }}
                            onBookSlots={(slots) => {
                              setBookError("");
                              bookMutation.mutate({
                                courtId: court.id,
                                date: courtViewDate,
                                hours: slots.map((slot) => slot.hour),
                              });
                            }}
                            onCancelBooking={(bookingId) => {
                              setBookError("");
                              cancelMutation.mutate(bookingId);
                            }}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
