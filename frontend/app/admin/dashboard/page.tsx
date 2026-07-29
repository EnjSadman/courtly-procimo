export default function AdminDashboardPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 text-card-foreground">
        <p className="text-sm text-muted-foreground">Admin area</p>
        <h1 className="mt-2 text-3xl font-bold">Admin dashboard</h1>
        <p className="mt-4 text-muted-foreground">
          This is a stub dashboard page for admins after login.
        </p>
      </div>
    </main>
  );
}
