"use client";

function SkeletonBox({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[14px] bg-[#E2E8F0] ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0]">
        <SkeletonBox className="mb-3 h-3 w-24" />
        <SkeletonBox className="mb-2 h-8 w-64" />
        <SkeletonBox className="h-4 w-80" />
        <div className="mt-4 flex gap-3">
          <SkeletonBox className="h-12 w-32 rounded-[18px]" />
          <SkeletonBox className="h-12 w-28 rounded-[18px]" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-5">
            <SkeletonBox className="mb-3 h-9 w-9 rounded-full" />
            <SkeletonBox className="mb-2 h-3 w-20" />
            <SkeletonBox className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-6">
          <SkeletonBox className="mb-4 h-6 w-32" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mb-3 rounded-[16px] border-2 border-[#E2E8F0] p-4">
              <SkeletonBox className="mb-2 h-4 w-3/4" />
              <SkeletonBox className="h-3 w-1/3" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-6">
              <SkeletonBox className="mb-3 h-5 w-28" />
              <SkeletonBox className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between border-b pb-4">
        <SkeletonBox className="h-7 w-24" />
        <SkeletonBox className="h-9 w-9 rounded-full" />
      </div>
      <div className="flex gap-4 border-b pb-2">
        <SkeletonBox className="h-8 w-20 rounded-[10px]" />
        <SkeletonBox className="h-8 w-20 rounded-[10px]" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-[16px] border-2 border-[#E2E8F0] p-4">
          <SkeletonBox className="mb-2 h-3 w-24" />
          <SkeletonBox className="h-10 w-full rounded-[10px]" />
        </div>
      ))}
    </div>
  );
}

export function WellnessSkeleton() {
  return (
    <div className="space-y-6">
      {/* Wellness score card */}
      <div className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-5 shadow-[6px_6px_0_0_#E2E8F0]">
        <div className="mb-4 flex items-center gap-3">
          <SkeletonBox className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <SkeletonBox className="mb-2 h-4 w-32" />
            <SkeletonBox className="h-3 w-48" />
          </div>
          <SkeletonBox className="h-8 w-16" />
        </div>
        <SkeletonBox className="mb-3 h-4 w-full rounded-full" />
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <SkeletonBox key={i} className="h-14 rounded-[12px]" />
          ))}
        </div>
      </div>

      {/* Burnout risk card */}
      <div className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-5 shadow-[6px_6px_0_0_#E2E8F0]">
        <div className="mb-4 flex items-center gap-3">
          <SkeletonBox className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <SkeletonBox className="mb-2 h-4 w-28" />
            <SkeletonBox className="h-3 w-40" />
          </div>
          <SkeletonBox className="h-8 w-12" />
        </div>
        <SkeletonBox className="mb-4 h-5 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonBox key={i} className="h-16 rounded-[14px]" />
          ))}
        </div>
      </div>

      {/* Today summary strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-[20px] border-2 border-[#E2E8F0] bg-white p-4">
            <SkeletonBox className="mb-2 h-9 w-9 rounded-full" />
            <SkeletonBox className="mb-1 h-3 w-12" />
            <SkeletonBox className="h-6 w-16" />
          </div>
        ))}
      </div>

      {/* Section cards — mood, hydration, sleep, activity */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-[24px] border-2 border-[#E2E8F0] bg-white shadow-[6px_6px_0_0_#E2E8F0]">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <SkeletonBox className="h-10 w-10 rounded-full" />
              <SkeletonBox className="h-5 w-32" />
            </div>
            <SkeletonBox className="h-5 w-5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GenericPageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-5">
            <SkeletonBox className="mb-3 h-9 w-9 rounded-full" />
            <SkeletonBox className="mb-2 h-3 w-20" />
            <SkeletonBox className="h-7 w-14" />
          </div>
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-6">
          <SkeletonBox className="mb-4 h-5 w-40" />
          <SkeletonBox className="mb-3 h-4 w-full" />
          <SkeletonBox className="mb-3 h-4 w-5/6" />
          <SkeletonBox className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
