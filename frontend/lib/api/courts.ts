import { apiFetch } from "@/lib/api/client";

export type CourtListItem = {
  id: string;
  name: string;
  sportTypeId: string;
  sportType: string;
  hourlyPrice: string;
  openTime: string;
  closeTime: string;
  isActive: boolean;
};

export type CourtsListResponse = {
  courts: CourtListItem[];
};

export type CourtInput = {
  name: string;
  sportTypeId: string;
  hourlyPrice: number;
  openTime: string;
  closeTime: string;
  isActive?: boolean;
};

export type CourtUpdateInput = Partial<CourtInput>;

export function listCourts() {
  return apiFetch<CourtsListResponse>("/courts");
}

export function getCourt(courtId: string) {
  return apiFetch<CourtListItem>(`/courts/${courtId}`);
}

export function createCourt(input: CourtInput) {
  return apiFetch<CourtListItem>("/courts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCourt(courtId: string, input: CourtUpdateInput) {
  return apiFetch<CourtListItem>(`/courts/${courtId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
