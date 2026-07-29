import { RequireRole } from "@/components/auth/RequireRole";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RequireRole roles={["USER", "ADMIN"]}>{children}</RequireRole>;
}
