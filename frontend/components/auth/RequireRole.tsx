"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { getMyProfile } from "@/lib/api/profiles";
import { queryKeys } from "@/lib/api/queryKeys";
import { homePathForRole, type Role } from "@/lib/auth/roles";

type RequireRoleProps = {
  children: ReactNode;
  roles: readonly Role[];
};

export function RequireRole({ children, roles }: RequireRoleProps) {
  const router = useRouter();
  const rolesKey = roles.join(",");
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: queryKeys.profileMe,
    queryFn: getMyProfile,
    retry: false,
  });

  const allowed = profile ? roles.includes(profile.role) : false;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isError || !profile) {
      router.replace("/");
      return;
    }

    if (!roles.includes(profile.role)) {
      router.replace(homePathForRole(profile.role));
    }
  }, [isLoading, isError, profile, roles, rolesKey, router]);

  if (isLoading || isError || !profile || !allowed) {
    return null;
  }

  return children;
}
