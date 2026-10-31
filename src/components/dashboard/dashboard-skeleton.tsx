export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 rounded-lg" />
          <div className="h-4 w-96 bg-slate-100 rounded-md" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-lg" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="h-28 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" />

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          />
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="h-80 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" />
        <div className="h-72 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" />
      </div>

      {/* Tables Skeleton */}
      <div className="h-64 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" />
    </div>
  );
}
