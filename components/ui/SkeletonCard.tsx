'use client';

export default function SkeletonCard() {
  return (
    <div className="bg-[#141414] border border-[#1E1E1E] p-5 space-y-3">
      <div className="skeleton h-5 w-3/4 rounded" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-5/6 rounded" />
      <div className="skeleton h-4 w-2/3 rounded" />
      <div className="flex gap-2 mt-4">
        <div className="skeleton h-7 w-20 rounded" />
        <div className="skeleton h-7 w-16 rounded" />
        <div className="skeleton h-7 w-24 rounded" />
      </div>
    </div>
  );
}
