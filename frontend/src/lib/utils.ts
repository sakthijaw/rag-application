import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a timestamp as a relative time string (e.g. "2 hours ago"). */
export function timeAgo(timestamp: number): string {
  const diffMs  = Date.now() - timestamp
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1)  return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

/** Truncate a string to `maxLength` chars with an ellipsis. */
export function truncate(str: string, maxLength: number): string {
  return str.length <= maxLength ? str : `${str.slice(0, maxLength - 1)}…`
}

/** Return Tailwind colour classes for a confidence level. */
export function confidenceColour(level: string): string {
  switch (level) {
    case 'high':   return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
    case 'low':    return 'text-rose-400 bg-rose-400/10 border-rose-400/20'
    default:       return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
  }
}

/** Return Tailwind colour classes for a similarity score (0–1). */
export function similarityColour(score: number): string {
  if (score >= 0.7) return 'bg-emerald-500'
  if (score >= 0.5) return 'bg-violet-500'
  if (score >= 0.3) return 'bg-amber-500'
  return 'bg-rose-500'
}

/** Format a similarity score as a percentage string. */
export function formatSimilarity(score: number): string {
  return `${Math.round(score * 100)}%`
}

/** Map a category slug to a display label. */
export function categoryLabel(cat: string): string {
  const MAP: Record<string, string> = {
    layout:     'Layout',
    ui:         'UI',
    forms:      'Forms',
    feedback:   'Feedback',
    data:       'Data',
    navigation: 'Navigation',
    marketing:  'Marketing',
    auth:       'Auth',
    dashboard:  'Dashboard',
    content:    'Content',
  }
  return MAP[cat] ?? cat
}

/** Map a category slug to a colour class. */
export function categoryColour(cat: string): string {
  const MAP: Record<string, string> = {
    layout:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ui:         'bg-violet-500/10 text-violet-400 border-violet-500/20',
    forms:      'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    feedback:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    data:       'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    navigation: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    marketing:  'bg-pink-500/10 text-pink-400 border-pink-500/20',
    auth:       'bg-rose-500/10 text-rose-400 border-rose-500/20',
    dashboard:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
    content:    'bg-teal-500/10 text-teal-400 border-teal-500/20',
  }
  return MAP[cat] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
}
