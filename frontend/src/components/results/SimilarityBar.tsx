interface SimilarityBarProps {
  score: number
  className?: string
}

export function SimilarityBar({ score, className }: SimilarityBarProps) {
  const pct  = Math.round(Math.min(Math.max(score, 0), 1) * 100)

  const fill =
    pct >= 70 ? 'var(--success)' :
    pct >= 45 ? 'var(--accent-2)' :
    'var(--warning)'

  return (
    <div className={`flex items-center gap-4 ${className ?? ''}`}>
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--border)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: fill,
            transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </div>
      <span
        className="text-sm font-semibold tabular-nums shrink-0 w-10 text-right"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
      >
        {pct}%
      </span>
    </div>
  )
}
