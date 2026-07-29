import { apiFetch } from "@/lib/api/client";

export type SportType = {
  id: string;
  name: string;
};

export type SportTypesResponse = {
  sportTypes: SportType[];
};

export function listSportTypes() {
  return apiFetch<SportTypesResponse>("/sport-types");
}
