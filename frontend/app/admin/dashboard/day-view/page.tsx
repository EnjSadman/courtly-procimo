"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDailyBookings } from "@/lib/api/bookings";
import { queryKeys } from "@/lib/api/queryKeys";
import { addCalendarDays } from "@/lib/courts/hours";
import { cn } from "@/lib/utils";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

const PREFETCH_WINDOW = 2;

export default function DayViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const date = searchParams.get("date") || todayString();

  const { data, isPlaceholderData, isLoading, isError } = useQuery({
    queryKey: queryKeys.dailyBookings(date),
    queryFn: () => getDailyBookings(date),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    for (let offset = -PREFETCH_WINDOW; offset <= PREFETCH_WINDOW; offset += 1) {
      if (offset === 0) continue;
      const prefetchDate = addCalendarDays(date, offset);
      queryClient.prefetchQuery({
        queryKey: queryKeys.dailyBookings(prefetchDate),
        queryFn: () => getDailyBookings(prefetchDate),
        staleTime: 30_000,
      });
    }
  }, [date, queryClient]);

  const displayDate = useMemo(() => {
    const d = new Date(date + "T12:00:00.000Z");
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(d);
  }, [date]);

  function goTo(offset: number) {
    const next = addCalendarDays(date, offset);
    router.push(`/admin/dashboard/day-view?date=${next}`);
  }

  const bookings = data?.bookings ?? [];
  const totalRevenue = data?.totalRevenue ?? "0.00";
  const confirmed = data?.confirmedBookings ?? 0;
  const cancelled = data?.cancelledBookings ?? 0;

  return (
    <main className="flex-1 px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Admin area</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
              Daily Bookings
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/dashboard")}
          >
            Back to Courts
          </Button>
        </div>

        <div className="mb-6 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous day"
            onClick={() => goTo(-1)}
          >
            <ChevronLeft />
          </Button>
          <h2
            className={cn(
              "min-w-56 text-center text-lg font-semibold",
              isPlaceholderData && "opacity-50",
            )}
          >
            {displayDate}
          </h2>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next day"
            onClick={() => goTo(1)}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={date === todayString()}
            onClick={() => goTo(0)}
          >
            Today
          </Button>
        </div>

        {isLoading && !data ? (
          <p className="text-center text-sm text-muted-foreground">Loading...</p>
        ) : isError ? (
          <p className="text-center text-sm text-destructive">
            Failed to load bookings.
          </p>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="mt-1 font-display text-2xl font-bold text-accent">
                  ${totalRevenue}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Total Bookings</p>
                <p className="mt-1 font-display text-2xl font-bold">
                  {bookings.length}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Confirmed</p>
                <p className="mt-1 font-display text-2xl font-bold text-green-600">
                  {confirmed}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Cancelled</p>
                <p className="mt-1 font-display text-2xl font-bold text-destructive">
                  {cancelled}
                </p>
              </div>
            </div>

            {bookings.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No bookings for this day.
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">Court</th>
                        <th className="px-4 py-3 font-medium">Sport</th>
                        <th className="px-4 py-3 font-medium">User</th>
                        <th className="px-4 py-3 font-medium">Hours</th>
                        <th className="px-4 py-3 font-medium text-right">Price</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr
                          key={booking.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 font-mono text-xs">
                            {new Date(booking.startsAt).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "UTC",
                              },
                            )}
                          </td>
                          <td className="px-4 py-3">{booking.courtName}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {booking.sportType}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {booking.userEmail}
                          </td>
                          <td className="px-4 py-3">{booking.duration}h</td>
                          <td className="px-4 py-3 text-right font-mono">
                            ${booking.price}
                          </td>
                          <td className="px-4 py-3">
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
