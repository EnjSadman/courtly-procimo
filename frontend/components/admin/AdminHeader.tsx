"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api/auth";
import { getMyProfile } from "@/lib/api/profiles";
import { queryKeys } from "@/lib/api/queryKeys";

export function AdminHeader() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: queryKeys.profileMe,
    queryFn: getMyProfile,
  });

  async function handleLogout() {
    try {
      const result = await logout();
      queryClient.clear();
      window.location.assign(result.redirect);
    } catch {
      queryClient.clear();
      window.location.assign("/sign-in");
    }
  }

  return (
    <header className="border-b border-border bg-header">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Logo />
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading…"
              : isError
                ? "Signed in"
                : profile?.email}
          </p>
          <ThemeToggle />
          <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
