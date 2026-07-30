import { CourtsList } from "@/components/common/CourtsList";

export default function AdminDashboardPage() {
  return (
    <main className="flex-1 px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <p className="text-sm text-muted-foreground">Admin area</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          Courts
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage court availability, pricing, and hours.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card p-2 text-card-foreground sm:p-4">
          <CourtsList editable />
        </div>
      </div>
    </main>
  );
}
