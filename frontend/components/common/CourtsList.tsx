"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CourtForm } from "@/components/admin/CourtForm";
import {
  CourtAvailabilityPanel,
  nextSelectedSlots,
  type SelectedSlot,
} from "@/components/common/CourtAvailabilityPanel";
import {
  listOccupiedSlots,
  type OccupiedSlotsResponse,
} from "@/lib/api/bookings";
import {
  listCourts,
  updateCourt,
  type CourtListItem,
} from "@/lib/api/courts";
import { queryKeys } from "@/lib/api/queryKeys";
import {
  addUtcDays,
  formatUtcDate,
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

function toOccupiedKeys(response?: OccupiedSlotsResponse) {
  return (response?.occupied ?? []).map((slot) =>
    occupiedSlotKey(slot.courtId, slot.startsAt),
  );
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

  const today = formatUtcDate();
  const viewDate =
    (expandedCourtId ? viewDateByCourt[expandedCourtId] : undefined) ?? today;

  const { data, error, isLoading } = useQuery({
    queryKey: queryKeys.courts,
    queryFn: listCourts,
  });

  const courts = data?.courts ?? [];
  const courtIds = courts.map((court) => court.id);

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

  const todayAvailabilityQuery = useQuery({
    queryKey: queryKeys.occupiedSlots(today, today, courtIds),
    queryFn: () =>
      listOccupiedSlots({
        date: today,
        courtIds,
      }),
    enabled: courtIds.length > 0,
    staleTime: AVAILABILITY_STALE_MS,
    refetchOnMount: "always",
  });

  const viewDayAvailabilityQuery = useQuery({
    queryKey: queryKeys.occupiedSlots(
      viewDate,
      viewDate,
      expandedCourtId ? [expandedCourtId] : [],
    ),
    queryFn: () =>
      listOccupiedSlots({
        date: viewDate,
        courtIds: expandedCourtId ? [expandedCourtId] : [],
      }),
    enabled: Boolean(expandedCourtId) && viewDate !== today,
    staleTime: AVAILABILITY_STALE_MS,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (!expandedCourtId) {
      return;
    }

    for (const offset of [1, 2, 3]) {
      void prefetchCourtDay(expandedCourtId, addUtcDays(today, offset));
    }
  }, [expandedCourtId, today, prefetchCourtDay]);

  useEffect(() => {
    if (!expandedCourtId) {
      return;
    }

    void prefetchCourtDay(expandedCourtId, addUtcDays(viewDate, -1));
    void prefetchCourtDay(expandedCourtId, addUtcDays(viewDate, 1));
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
    expandedCourtId && viewDate !== today
      ? queryClient.getQueryData<OccupiedSlotsResponse>(
          queryKeys.occupiedSlots(viewDate, viewDate, [expandedCourtId]),
        )
      : undefined;

  const occupiedKeys = new Set([
    ...toOccupiedKeys(todayAvailabilityQuery.data),
    ...toOccupiedKeys(viewDayAvailabilityQuery.data ?? cachedViewDay),
  ]);

  const availabilityPending =
    viewDate === today
      ? todayAvailabilityQuery.isPending && !todayAvailabilityQuery.data
      : viewDayAvailabilityQuery.isPending &&
        !viewDayAvailabilityQuery.data &&
        !cachedViewDay;

  function toggleExpanded(courtId: string) {
    setExpandedCourtId((current) => {
      if (current === courtId) {
        return null;
      }

      setViewDateByCourt((dates) => ({
        ...dates,
        [courtId]: dates[courtId] ?? today,
      }));
      return courtId;
    });
  }

  function setViewDate(courtId: string, date: string) {
    setViewDateByCourt((current) => ({
      ...current,
      [courtId]: date,
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
                        onClick={() => toggleExpanded(court.id)}
                      >
                        {court.name}
                      </td>
                      <td
                        className="cursor-pointer px-3 py-3 text-muted-foreground"
                        onClick={() => toggleExpanded(court.id)}
                      >
                        {court.sportType}
                      </td>
                      <td
                        className="cursor-pointer px-3 py-3 text-muted-foreground"
                        onClick={() => toggleExpanded(court.id)}
                      >
                        {formatPrice(court.hourlyPrice)}
                      </td>
                      <td
                        className="cursor-pointer px-3 py-3 text-muted-foreground"
                        onClick={() => toggleExpanded(court.id)}
                      >
                        {court.openTime}–{court.closeTime}
                      </td>
                      {editable ? (
                        <>
                          <td
                            className="cursor-pointer px-3 py-3"
                            onClick={() => toggleExpanded(court.id)}
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
                            openTime={court.openTime}
                            closeTime={court.closeTime}
                            date={courtViewDate}
                            today={today}
                            onDateChange={(date) =>
                              setViewDate(court.id, date)
                            }
                            occupiedKeys={occupiedKeys}
                            selectable={!editable}
                            selectedSlots={selectedByCourt[court.id] ?? []}
                            isLoading={availabilityPending}
                            onToggleSlot={(slot) => {
                              setSelectedByCourt((current) => ({
                                ...current,
                                [court.id]: nextSelectedSlots(
                                  current[court.id] ?? [],
                                  slot,
                                ),
                              }));
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
