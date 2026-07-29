import type { Profile } from "@/lib/api/profiles";

export type Role = Profile["role"];

export function homePathForRole(role: Role) {
  return role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
}
