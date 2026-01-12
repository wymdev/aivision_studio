"use client";

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Users</h3>
          </div>
          <div className="text-2xl font-bold">1,234</div>
          <p className="text-xs text-muted-foreground">
            +20% from last month
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Active Sessions</h3>
          </div>
          <div className="text-2xl font-bold">543</div>
          <p className="text-xs text-muted-foreground">
            +15% from last month
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Revenue</h3>
          </div>
          <div className="text-2xl font-bold">$45,231</div>
          <p className="text-xs text-muted-foreground">
            +7% from last month
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Conversion Rate</h3>
          </div>
          <div className="text-2xl font-bold">24.5%</div>
          <p className="text-xs text-muted-foreground">
            +3% from last month
          </p>
        </div>
      </div>
    </div>
  );
}
