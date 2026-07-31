"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyBookings, cancelBooking } from "@/lib/api/bookings";
import type { MyBooking } from "@/lib/api/bookings";
import { queryKeys } from "@/lib/api/queryKeys";
import { cn } from "@/lib/utils";

const CANCEL_LEAD_MS = 2 * 60 * 60 * 1000;

function canCancel(startsAt: string): boolean {
  return new Date(startsAt).getTime() - Date.now() > CANCEL_LEAD_MS;
}

function isUpcoming(startsAt: string): boolean {
  return new Date(startsAt).getTime() > Date.now();
}

export default function MyBookingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.myBookings,
    queryFn: getMyBookings,
    staleTime: 15_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => cancelBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myBookings });
      setCancellingId(null);
    },
    onError: (error: Error) => {
      setErrorMsg(error.message || "Failed to cancel booking.");
      setCancellingId(null);
    },
  });

  function handleCancel(bookingId: string) {
    setErrorMsg("");
    setCancellingId(bookingId);
    cancelMutation.mutate(bookingId);
  }

  const bookings = data?.bookings ?? [];

  return (
    <main className="flex-1 px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">User area</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
              My Bookings
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard")}
          >
            <ChevronLeft />
            Back to Courts
          </Button>
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading...
          </p>
        ) : isError ? (
          <p className="py-12 text-center text-sm text-destructive">
            Failed to load bookings.
          </p>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">You have no bookings yet.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => router.push("/dashboard")}
            >
              Browse courts
            </Button>
          </div>
        ) : (
          <>
            {errorMsg ? (
              <p className="mb-4 text-sm text-destructive" role="alert">
                {errorMsg}
              </p>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">Court</th>
                      <th className="px-4 py-3 font-medium">Sport</th>
                      <th className="px-4 py-3 font-medium">Duration</th>
                      <th className="px-4 py-3 font-medium text-right">Price</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => {
                      const upcoming = isUpcoming(booking.startsAt);
                      const showCancel =
                        booking.status === "CONFIRMED" &&
                        upcoming &&
                        canCancel(booking.startsAt);
                      const isProcessing = cancellingId === booking.id;

                      return (
                        <BookingRow
                          key={booking.id}
                          booking={booking}
                          upcoming={upcoming}
                          showCancel={showCancel}
                          isProcessing={isProcessing}
                          onCancel={handleCancel}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function BookingRow({
  booking,
  upcoming,
  showCancel,
  isProcessing,
  onCancel,
}: {
  booking: MyBooking;
  upcoming: boolean;
  showCancel: boolean;
  isProcessing: boolean;
  onCancel: (id: string) => void;
}) {
  const startsAt = new Date(booking.startsAt);
  const dateStr = startsAt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const timeStr = startsAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

  const isCancelled = booking.status === "CANCELLED";
  const isPast = !upcoming && !isCancelled;

  return (
    <tr
      className={cn(
        "border-b border-border last:border-0 hover:bg-muted/30",
        isCancelled && "opacity-50",
        isPast && "text-muted-foreground",
      )}
    >
      <td className="px-4 py-3 whitespace-nowrap">{dateStr}</td>
      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
        {timeStr}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">{booking.courtName}</td>
      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
        {booking.sportType}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">{booking.duration}h</td>
      <td className="px-4 py-3 whitespace-nowrap text-right font-mono">
        ${booking.price}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className={cn(
            "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
            booking.status === "CONFIRMED"
              ? "bg-green-600/10 text-green-600"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {booking.status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {showCancel ? (
          <Button
            variant="ghost"
            size="xs"
            disabled={isProcessing}
            onClick={() => onCancel(booking.id)}
            title="Cancel booking"
          >
            {isProcessing ? (
              "Cancelling..."
            ) : (
              <>
                <XCircle />
                Cancel
              </>
            )}
          </Button>
        ) : null}
      </td>
    </tr>
  );
}
