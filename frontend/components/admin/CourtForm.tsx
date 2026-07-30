"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeSelect } from "@/components/ui/time-select";
import {
  createCourt,
  updateCourt,
  type CourtListItem,
} from "@/lib/api/courts";
import { listSportTypes } from "@/lib/api/sportTypes";
import { queryKeys } from "@/lib/api/queryKeys";
import { getBrowserTimeZone } from "@/lib/courts/hours";

type CourtFormProps = {
  court?: CourtListItem | null;
  onClose: () => void;
};

type FormState = {
  name: string;
  sportTypeId: string;
  hourlyPrice: string;
  openTime: string;
  closeTime: string;
  isActive: boolean;
};

function toFormState(court?: CourtListItem | null): FormState {
  return {
    name: court?.name ?? "",
    sportTypeId: court?.sportTypeId ?? "",
    hourlyPrice: court?.hourlyPrice ?? "",
    openTime: court?.openTime ?? "08:00",
    closeTime: court?.closeTime ?? "22:00",
    isActive: court?.isActive ?? true,
  };
}

export function CourtForm({ court, onClose }: CourtFormProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(court);
  const [form, setForm] = useState<FormState>(() => toFormState(court));
  const [errorMessage, setErrorMessage] = useState("");

  const { data: sportTypesData, isLoading: isLoadingSportTypes } = useQuery({
    queryKey: queryKeys.sportTypes,
    queryFn: listSportTypes,
  });

  useEffect(() => {
    setForm(toFormState(court));
    setErrorMessage("");
  }, [court]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const hourlyPrice = Number(form.hourlyPrice);
      if (!form.name.trim()) {
        throw new Error("Court name is required.");
      }
      if (!form.sportTypeId) {
        throw new Error("Please select a sport type.");
      }
      if (!Number.isFinite(hourlyPrice) || hourlyPrice <= 0) {
        throw new Error("Hourly price must be greater than zero.");
      }

      const payload = {
        name: form.name.trim(),
        sportTypeId: form.sportTypeId,
        hourlyPrice,
        openTime: form.openTime,
        closeTime: form.closeTime,
        timezone: court?.timezone ?? getBrowserTimeZone(),
        isActive: form.isActive,
      };

      if (court) {
        return updateCourt(court.id, payload);
      }

      return createCourt(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.courts });
      onClose();
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save court.",
      );
    },
  });

  const sportTypes = sportTypesData?.sportTypes ?? [];

  return (
    <form
      className="space-y-4 rounded-2xl border border-border bg-card p-4 text-card-foreground"
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage("");
        saveMutation.mutate();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight">
          {isEditing ? "Edit court" : "Create court"}
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Name</span>
          <Input
            className="text-foreground placeholder:text-muted-foreground dark:text-white dark:placeholder:text-white/55"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            required
          />
        </label>

        <div className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Sport</span>
          <Select
            value={form.sportTypeId || null}
            onValueChange={(value) => {
              if (typeof value === "string") {
                setForm((current) => ({ ...current, sportTypeId: value }));
              }
            }}
            disabled={isLoadingSportTypes}
            required
          >
            <SelectTrigger className="w-full text-foreground dark:text-white">
              <SelectValue placeholder="Select sport" />
            </SelectTrigger>
            <SelectContent>
              {sportTypes.map((sportType) => (
                <SelectItem key={sportType.id} value={sportType.id}>
                  {sportType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Hourly price</span>
          <Input
            className="text-foreground placeholder:text-muted-foreground dark:text-white dark:placeholder:text-white/55"
            type="number"
            min="0"
            step="0.01"
            value={form.hourlyPrice}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                hourlyPrice: event.target.value,
              }))
            }
            required
          />
        </label>

        <div className="flex items-center gap-3 self-end pb-1">
          <Switch
            checked={form.isActive}
            onCheckedChange={(checked) =>
              setForm((current) => ({
                ...current,
                isActive: checked,
              }))
            }
          />
          <span className="text-sm text-muted-foreground">
            {form.isActive ? "Active" : "Deactivated"}
          </span>
        </div>

        <div className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Opens</span>
          <TimeSelect
            value={form.openTime}
            onValueChange={(openTime) =>
              setForm((current) => ({ ...current, openTime }))
            }
            required
          />
        </div>

        <div className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">Closes</span>
          <TimeSelect
            value={form.closeTime}
            onValueChange={(closeTime) =>
              setForm((current) => ({ ...current, closeTime }))
            }
            required
          />
        </div>
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" disabled={saveMutation.isPending}>
        {saveMutation.isPending
          ? "Saving…"
          : isEditing
            ? "Save changes"
            : "Create court"}
      </Button>
    </form>
  );
}
