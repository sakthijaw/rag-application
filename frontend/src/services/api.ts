import type { SearchResult, ComponentListResponse, ComponentDetail } from '../types'

/** Base URL — uses Vite proxy in dev; falls back to VITE_API_URL env var. */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch (err) {
    // Network error, backend offline, CORS, etc.
    throw new Error(
      err instanceof TypeError
        ? 'Cannot reach the backend. Is the API server running?'
        : String(err),
    )
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }

  try {
    return (await res.json()) as T
  } catch {
    throw new Error('Invalid JSON in API response')
  }
}

/** Search for a component by natural-language query. */
export async function searchComponents(query: string): Promise<SearchResult> {
  return request<SearchResult>('/api/search', {
    method: 'POST',
    body: JSON.stringify({ query }),
  })
}

/** Check that the backend is up and return its status. */
export async function checkHealth(): Promise<{ status: string; model: string; components: number }> {
  return request('/api/health')
}

/** Fetch all indexed components (summary info). */
export async function fetchComponents(): Promise<ComponentListResponse> {
  return request<ComponentListResponse>('/api/components')
}

/** Fetch full metadata for a single component by name. */
export async function fetchComponentDetail(name: string): Promise<ComponentDetail> {
  return request<ComponentDetail>(`/api/components/${encodeURIComponent(name)}`)
}
