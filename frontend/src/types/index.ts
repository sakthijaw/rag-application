// ── Component data types ─────────────────────────────────────

export interface Prop {
  name: string
  type: string
  required: boolean
  default: string | null
  description: string
}

export interface Slot {
  name: string
  description: string
}

export interface Alternative {
  name: string
  category: string
  similarity: number
  description: string
}

export interface ComponentResult {
  no_match: false
  component: string
  category: string
  confidence: 'high' | 'medium' | 'low'
  similarity: number
  reason: string
  import_path: string
  usage: string
  props: Prop[]
  slots: Slot[]
  tags: string[]
  accessibility_notes: string
  alternatives: Alternative[]
}

export interface NoMatchResult {
  no_match: true
  message: string
}

export type SearchResult = ComponentResult | NoMatchResult

// ── Search history ────────────────────────────────────────────

export interface SearchHistoryItem {
  id: string
  query: string
  timestamp: number
  componentName?: string   // name of top result, if any
  category?: string
}

// ── Loading steps shown during search ────────────────────────

export interface LoadingStep {
  id: string
  label: string
  durationMs: number       // approximate time before next step advances
}

export const LOADING_STEPS: LoadingStep[] = [
  { id: 'embed',    label: 'Embedding query...',              durationMs: 600  },
  { id: 'search',   label: 'Searching vector database...',    durationMs: 600  },
  { id: 'rank',     label: 'Ranking results...',              durationMs: 400  },
  { id: 'generate', label: 'Generating recommendation...',   durationMs: 9999 },
]

// ── UI helpers ────────────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none'

export interface SuggestedPrompt {
  icon: string
  label: string
  query: string
}

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { icon: '🚀', label: 'SaaS landing page',    query: 'Build a SaaS landing page hero section' },
  { icon: '🔐', label: 'Login form',            query: 'Login form with email and password validation' },
  { icon: '📊', label: 'Activity feed',         query: 'Dashboard activity feed for admin panel' },
  { icon: '💰', label: 'Pricing table',         query: 'Responsive pricing table with plan cards' },
  { icon: '🧭', label: 'Navigation',            query: 'Responsive navbar with hamburger menu' },
  { icon: '📋', label: 'Data table',            query: 'Sortable data table with pagination' },
  { icon: '🔔', label: 'Notifications',         query: 'Toast notifications for success and errors' },
  { icon: '👤', label: 'Profile card',          query: 'User profile card with bio and avatar' },
]

// ── Component library types ──────────────────────────────────

export interface ComponentListItem {
  name: string
  category: string
  description: string
  tags: string[]
  import_path: string
  props_count: number
  has_slots: boolean
}

export interface ComponentListResponse {
  total: number
  components: ComponentListItem[]
}

export interface ComponentDetail {
  name: string
  category: string
  description: string
  import_path: string
  file_path: string
  props: Prop[]
  slots: Slot[]
  tags: string[]
  accessibility_notes: string
  usage_example: string
  dependencies: string[]
  events: string[]
}

