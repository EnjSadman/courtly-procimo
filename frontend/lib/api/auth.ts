import { apiFetch } from "@/lib/api/client";

export type LogoutResponse = {
  redirect: string;
};

export function logout() {
  return apiFetch<LogoutResponse>("/auth/logout", {
    method: "POST",
  });
}
