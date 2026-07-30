"use client";

import { useRouter } from "next/navigation";
import { CourtsList } from "@/components/common/CourtsList";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();

  return (
    <main className="flex-1 px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Admin area</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
              Courts
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage court availability, pricing, and hours.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(
                `/admin/dashboard/day-view?date=${new Date().toISOString().slice(0, 10)}`,
              )
            }
          >
            <CalendarDays />
            Day View
          </Button>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card p-2 text-card-foreground sm:p-4">
          <CourtsList editable />
        </div>
      </div>
    </main>
  );
}
