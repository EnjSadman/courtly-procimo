import { apiFetch } from "@/lib/api/client";

export type OccupiedSlot = {
  courtId: string;
  startsAt: string;
};

export type OccupiedSlotsResponse = {
  occupied: OccupiedSlot[];
};

export type OccupiedSlotsParams = {
  date?: string;
  from?: string;
  to?: string;
  courtIds?: string[];
};

export function listOccupiedSlots(params: OccupiedSlotsParams) {
  const search = new URLSearchParams();

  if (params.date) {
    search.set("date", params.date);
  } else {
    if (params.from) {
      search.set("from", params.from);
    }
    if (params.to) {
      search.set("to", params.to);
    }
  }

  if (params.courtIds && params.courtIds.length > 0) {
    search.set("courtIds", params.courtIds.join(","));
  }

  return apiFetch<OccupiedSlotsResponse>(
    `/bookings/occupied?${search.toString()}`,
  );
}
