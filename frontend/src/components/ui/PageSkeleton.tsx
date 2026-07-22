"use client";

import React from "react";

export function SkeletonBox({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[14px] bg-[#E2E8F0] ${className}`} />;
}

/* ─── Dashboard Skeleton ─────────────────────────────────────── */
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
          <div key={i} className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-5 shadow-[4px_4px_0_0_#E2E8F0]">
            <SkeletonBox className="mb-3 h-9 w-9 rounded-full" />
            <SkeletonBox className="mb-2 h-3 w-20" />
            <SkeletonBox className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0]">
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
            <div key={i} className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0]">
              <SkeletonBox className="mb-3 h-5 w-28" />
              <SkeletonBox className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Academic Forge Skeleton ───────────────────────────────── */
export function AcademicSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top CGPA & Target Header */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-5 shadow-[4px_4px_0_0_#E2E8F0]">
            <SkeletonBox className="mb-2 h-3 w-24" />
            <SkeletonBox className="h-9 w-20" />
          </div>
        ))}
      </div>

      {/* Courses List & Grade Calculator */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0]">
          <div className="mb-4 flex items-center justify-between">
            <SkeletonBox className="h-6 w-40" />
            <SkeletonBox className="h-9 w-28 rounded-[12px]" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="mb-3 flex items-center justify-between rounded-[16px] border-2 border-[#E2E8F0] p-4">
              <div>
                <SkeletonBox className="mb-1.5 h-4 w-36" />
                <SkeletonBox className="h-3 w-24" />
              </div>
              <SkeletonBox className="h-7 w-16 rounded-full" />
            </div>
          ))}
        </div>

        <div className="rounded-[28px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0]">
          <SkeletonBox className="mb-4 h-6 w-36" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mb-4 space-y-2">
              <SkeletonBox className="h-3 w-28" />
              <SkeletonBox className="h-10 w-full rounded-[10px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Focus Lock / Pomodoro Skeleton ───────────────────────── */
export function FocusSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Main Pomodoro Clock Card */}
        <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-[#E2E8F0] bg-white p-8 text-center shadow-[6px_6px_0_0_#E2E8F0]">
          <SkeletonBox className="mb-4 h-5 w-32" />
          <SkeletonBox className="my-4 h-48 w-48 rounded-full" />
          <div className="mt-4 flex gap-4">
            <SkeletonBox className="h-12 w-32 rounded-[18px]" />
            <SkeletonBox className="h-12 w-28 rounded-[18px]" />
          </div>
        </div>

        {/* Focus Lock Status & Blocker */}
        <div className="space-y-6">
          <div className="rounded-[28px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0]">
            <SkeletonBox className="mb-3 h-5 w-40" />
            <SkeletonBox className="mb-4 h-4 w-64" />
            <SkeletonBox className="h-12 w-full rounded-[14px]" />
          </div>
          <div className="rounded-[28px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0]">
            <SkeletonBox className="mb-4 h-5 w-36" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="mb-2 flex items-center justify-between rounded-[12px] border-2 border-[#E2E8F0] p-3">
                <SkeletonBox className="h-4 w-32" />
                <SkeletonBox className="h-6 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Smart Notes Vault Skeleton ────────────────────────────── */
export function NotesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Search & Recording Bar */}
      <div className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-5 shadow-[4px_4px_0_0_#E2E8F0]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SkeletonBox className="h-10 w-64 rounded-[12px]" />
          <div className="flex gap-3">
            <SkeletonBox className="h-10 w-32 rounded-[14px]" />
            <SkeletonBox className="h-10 w-28 rounded-[14px]" />
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-5 shadow-[4px_4px_0_0_#E2E8F0]">
            <div className="mb-3 flex items-center justify-between">
              <SkeletonBox className="h-5 w-24 rounded-full" />
              <SkeletonBox className="h-3 w-16" />
            </div>
            <SkeletonBox className="mb-2 h-5 w-3/4" />
            <SkeletonBox className="mb-2 h-3 w-full" />
            <SkeletonBox className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Student Finance Skeleton ─────────────────────────────── */
export function FinanceSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top Balance Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-5 shadow-[4px_4px_0_0_#E2E8F0]">
            <SkeletonBox className="mb-2 h-3 w-24" />
            <SkeletonBox className="mb-1 h-8 w-32" />
            <SkeletonBox className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Transactions & Budget breakdown */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0]">
          <div className="mb-4 flex items-center justify-between">
            <SkeletonBox className="h-6 w-36" />
            <SkeletonBox className="h-9 w-28 rounded-[12px]" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mb-3 flex items-center justify-between rounded-[14px] border-2 border-[#E2E8F0] p-3.5">
              <div className="flex items-center gap-3">
                <SkeletonBox className="h-9 w-9 rounded-full" />
                <div>
                  <SkeletonBox className="mb-1 h-4 w-28" />
                  <SkeletonBox className="h-3 w-20" />
                </div>
              </div>
              <SkeletonBox className="h-5 w-16" />
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0]">
            <SkeletonBox className="mb-3 h-5 w-32" />
            <SkeletonBox className="mb-2 h-4 w-full rounded-full" />
            <SkeletonBox className="h-3 w-40" />
          </div>
          <div className="rounded-[28px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0]">
            <SkeletonBox className="mb-4 h-5 w-28" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="mb-3 rounded-[12px] border-2 border-[#E2E8F0] p-3">
                <SkeletonBox className="mb-1.5 h-3.5 w-32" />
                <SkeletonBox className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Wellness Shield Skeleton ──────────────────────────────── */
export function WellnessSkeleton() {
  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-[20px] border-2 border-[#E2E8F0] bg-white p-4 shadow-[4px_4px_0_0_#E2E8F0]">
            <SkeletonBox className="mb-2 h-9 w-9 rounded-full" />
            <SkeletonBox className="mb-1 h-3 w-12" />
            <SkeletonBox className="h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── AI Behavioral Coach Skeleton ─────────────────────────── */
export function CoachSkeleton() {
  return (
    <div className="space-y-6">
      {/* Weekly Report Card Skeleton */}
      <div className="rounded-[28px] border-2 border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-[6px_6px_0_0_#E2E8F0]">
        <div className="mb-6 flex items-center gap-3.5">
          <SkeletonBox className="h-12 w-12 rounded-xl" />
          <div>
            <SkeletonBox className="mb-1.5 h-6 w-48" />
            <SkeletonBox className="h-3 w-32" />
          </div>
        </div>
        <div className="mb-6 flex flex-wrap gap-2.5">
          {[...Array(4)].map((_, i) => (
            <SkeletonBox key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>
        <SkeletonBox className="h-32 w-full rounded-[20px]" />
      </div>

      {/* Distraction Patterns Charts Skeleton */}
      <div className="rounded-[28px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0]">
        <div className="mb-4 flex items-center justify-between">
          <SkeletonBox className="h-6 w-48" />
          <SkeletonBox className="h-9 w-32 rounded-[14px]" />
        </div>
        <SkeletonBox className="mb-4 h-4 w-64" />
        <SkeletonBox className="h-56 w-full rounded-[16px]" />
      </div>
    </div>
  );
}

/* ─── Analytics Skeleton ────────────────────────────────────── */
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 font-body">
      <div className="rounded-[28px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <SkeletonBox className="mb-2 h-7 w-48" />
          <SkeletonBox className="h-4 w-72" />
        </div>
        <SkeletonBox className="h-10 w-64 rounded-full" />
      </div>

      <div className="space-y-4">
        <SkeletonBox className="h-6 w-36" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-[28px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0] lg:col-span-2">
            <SkeletonBox className="mb-4 h-6 w-56" />
            <SkeletonBox className="h-64 w-full rounded-[20px]" />
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-4 shadow-[4px_4px_0_0_#E2E8F0]">
                <SkeletonBox className="mb-2 h-4 w-28" />
                <SkeletonBox className="h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Settings Skeleton ─────────────────────────────────────── */
export function SettingsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0]">
        <div className="mb-4 flex items-center justify-between">
          <SkeletonBox className="h-6 w-32" />
          <SkeletonBox className="h-10 w-10 rounded-full" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonBox className="h-3.5 w-24" />
              <SkeletonBox className="h-11 w-full rounded-[14px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Landing Page Skeleton ─────────────────────────────────── */
export function LandingSkeleton() {
  return (
    <div className="min-h-screen bg-[#FFFDF5] p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Nav header */}
        <div className="flex items-center justify-between rounded-[20px] border-2 border-[#E2E8F0] bg-white p-4 shadow-[4px_4px_0_0_#E2E8F0]">
          <SkeletonBox className="h-10 w-36" />
          <div className="hidden gap-4 sm:flex">
            <SkeletonBox className="h-9 w-20" />
            <SkeletonBox className="h-9 w-20" />
          </div>
          <SkeletonBox className="h-10 w-28 rounded-full" />
        </div>

        {/* Hero Banner */}
        <div className="rounded-[32px] border-2 border-[#E2E8F0] bg-white p-8 sm:p-12 shadow-[8px_8px_0_0_#E2E8F0]">
          <SkeletonBox className="mb-4 h-6 w-48 rounded-full" />
          <SkeletonBox className="mb-4 h-12 w-3/4" />
          <SkeletonBox className="mb-6 h-5 w-1/2" />
          <div className="flex gap-4">
            <SkeletonBox className="h-12 w-40 rounded-full" />
            <SkeletonBox className="h-12 w-32 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Generic Fallback Skeleton ─────────────────────────────── */
export function GenericPageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-5 shadow-[4px_4px_0_0_#E2E8F0]">
            <SkeletonBox className="mb-3 h-9 w-9 rounded-full" />
            <SkeletonBox className="mb-2 h-3 w-20" />
            <SkeletonBox className="h-7 w-14" />
          </div>
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="rounded-[24px] border-2 border-[#E2E8F0] bg-white p-6 shadow-[6px_6px_0_0_#E2E8F0]">
          <SkeletonBox className="mb-4 h-5 w-40" />
          <SkeletonBox className="mb-3 h-4 w-full" />
          <SkeletonBox className="mb-3 h-4 w-5/6" />
          <SkeletonBox className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
