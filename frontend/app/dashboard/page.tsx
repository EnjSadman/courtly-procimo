export default function DashboardPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-8 text-card-foreground">
        <p className="text-sm text-muted-foreground">User area</p>
        <h1 className="mt-2 text-3xl font-bold">Dashboard</h1>
        <p className="mt-4 text-muted-foreground">
          This is a stub dashboard page for regular users after login.
        </p>
      </div>
    </main>
  );
}
