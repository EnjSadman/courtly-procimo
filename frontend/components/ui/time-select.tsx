"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TIME_OPTIONS = buildTimeOptions(30);

function buildTimeOptions(stepMinutes: number) {
  const options: string[] = [];

  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    options.push(
      `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`,
    );
  }

  return options;
}

type TimeSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
};

export function TimeSelect({
  value,
  onValueChange,
  disabled,
  className,
  id,
  name,
  required,
}: TimeSelectProps) {
  const options =
    value && !TIME_OPTIONS.includes(value)
      ? [...TIME_OPTIONS, value].sort()
      : TIME_OPTIONS;

  return (
    <Select
      value={value || null}
      onValueChange={(nextValue) => {
        if (typeof nextValue === "string") {
          onValueChange(nextValue);
        }
      }}
      disabled={disabled}
      name={name}
      required={required}
    >
      <SelectTrigger
        id={id}
        className={cn(
          "w-full text-foreground dark:text-white",
          className,
        )}
      >
        <SelectValue placeholder="Select time" />
      </SelectTrigger>
      <SelectContent>
        {options.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
