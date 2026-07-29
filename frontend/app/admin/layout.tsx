import { AdminHeader } from "@/components/admin/AdminHeader";
import { RequireRole } from "@/components/auth/RequireRole";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RequireRole roles={["ADMIN"]}>
      <AdminHeader />
      {children}
    </RequireRole>
  );
}
