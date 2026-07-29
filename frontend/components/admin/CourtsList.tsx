"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CourtForm } from "@/components/admin/CourtForm";
import {
  listCourts,
  updateCourt,
  type CourtListItem,
} from "@/lib/api/courts";
import { queryKeys } from "@/lib/api/queryKeys";

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

export function CourtsList() {
  const queryClient = useQueryClient();
  const [editingCourt, setEditingCourt] = useState<CourtListItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState("");

  const { data, error, isLoading } = useQuery({
    queryKey: queryKeys.courts,
    queryFn: listCourts,
  });

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

  const courts = data?.courts ?? [];
  const showForm = isCreating || editingCourt !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {courts.length} court{courts.length === 1 ? "" : "s"}
        </p>
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
        <p className="text-sm text-muted-foreground">No courts yet.</p>
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
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courts.map((court) => (
                <tr
                  key={court.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-3 py-3 font-medium text-foreground">
                    {court.name}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {court.sportType}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {formatPrice(court.hourlyPrice)}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {court.openTime}–{court.closeTime}
                  </td>
                  <td className="px-3 py-3">
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
                        variant={court.isActive ? "destructive" : "outline"}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
