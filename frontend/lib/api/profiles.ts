import { apiFetch } from "@/lib/api/client";

export type Profile = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
};

export function getMyProfile() {
  return apiFetch<Profile>("/profiles/me");
}

export function getProfileById(userId: string) {
  return apiFetch<Profile>(`/profiles/${userId}`);
}
