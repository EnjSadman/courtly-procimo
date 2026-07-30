import { apiFetch } from "@/lib/api/client";

export type OccupiedSlot = {
  courtId: string;
  startsAt: string;
};

export type MineSlot = {
  courtId: string;
  startsAt: string;
  bookingId: string;
  bookingStartsAt: string;
};

export type OccupiedSlotsResponse = {
  occupied: OccupiedSlot[];
  mine: MineSlot[];
};

export type OccupiedSlotsParams = {
  date?: string;
  from?: string;
  to?: string;
  courtIds?: string[];
};

export type CreateBookingInput = {
  courtId: string;
  date: string;
  hours: string[];
};

export type CreateBookingResponse = {
  id: string;
  courtId: string;
  startsAt: string;
  duration: number;
  price: string;
  status: string;
  slots: string[];
};

export function listOccupiedSlots(params: OccupiedSlotsParams) {
  return apiFetch<OccupiedSlotsResponse>("/bookings/search", {
    method: "POST",
    body: JSON.stringify({
      ...(params.date ? { date: params.date } : {}),
      ...(params.from ? { from: params.from } : {}),
      ...(params.to ? { to: params.to } : {}),
      ...(params.courtIds && params.courtIds.length > 0
        ? { courtIds: params.courtIds }
        : {}),
    }),
  });
}

export function createBooking(input: CreateBookingInput) {
  return apiFetch<CreateBookingResponse>("/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cancelBooking(bookingId: string) {
  return apiFetch<void>(`/bookings/${bookingId}/cancel`, {
    method: "POST",
  });
}

export type DailyBookingSlot = {
  startsAt: string;
};

export type DailyBooking = {
  id: string;
  userId: string;
  userEmail: string;
  courtId: string;
  courtName: string;
  sportType: string;
  startsAt: string;
  duration: number;
  price: string;
  status: string;
  slots: DailyBookingSlot[];
};

export type DailyBookingsResponse = {
  date: string;
  bookings: DailyBooking[];
  totalRevenue: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
};

export function getDailyBookings(date: string) {
  return apiFetch<DailyBookingsResponse>(
    `/bookings/daily?date=${encodeURIComponent(date)}`,
  );
}
