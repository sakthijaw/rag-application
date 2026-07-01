function SkeletonLine({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return (
    <div
      className={`${width} ${height} rounded animate-pulse`}
      style={{ background: 'var(--border)' }}
    />
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`rounded animate-pulse ${className ?? ''}`}
      style={{ background: 'var(--border)' }}
      aria-hidden
    />
  )
}

export function ResultSkeleton() {
  const divider = { borderBottom: '1px solid var(--border)' } as const
  const subtleHeader = { ...divider, background: 'var(--bg-subtle)' } as const

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="px-6 pt-6 pb-5" style={divider}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <SkeletonLine width="w-48" height="h-7" />
            <div className="flex gap-3">
              <SkeletonLine width="w-24" height="h-5" />
              <SkeletonLine width="w-20" height="h-5" />
              <SkeletonLine width="w-36" height="h-5" />
            </div>
          </div>
          <SkeletonLine width="w-24" height="h-8" />
        </div>
      </div>

      {/* Match score row */}
      <div className="flex items-center gap-6 px-6 py-4" style={divider}>
        <SkeletonLine width="w-20" height="h-4" />
        <SkeletonLine height="h-1.5" />
      </div>

      {/* Reason */}
      <div className="px-6 py-5 space-y-2" style={divider}>
        <SkeletonLine />
        <SkeletonLine width="w-4/5" />
        <SkeletonLine width="w-2/3" />
      </div>

      {/* Import section header */}
      <div style={divider}>
        <div className="px-6 py-2.5 h-10" style={subtleHeader} />
        <div className="px-6 py-4">
          <SkeletonLine height="h-16" />
        </div>
      </div>

      {/* Usage section header */}
      <div style={divider}>
        <div className="px-6 py-2.5 h-10" style={{ background: 'var(--bg-subtle)' }} />
      </div>

      {/* Props section */}
      <div style={divider}>
        <div className="px-6 py-2.5 h-10" style={subtleHeader} />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-4 px-6 py-2.5" style={divider}>
            <SkeletonLine width="w-28" height="h-4" />
            <SkeletonLine width="w-20" height="h-4" />
            <SkeletonLine width="w-16" height="h-4" />
            <SkeletonLine height="h-4" />
          </div>
        ))}
      </div>
    </div>
  )
}
