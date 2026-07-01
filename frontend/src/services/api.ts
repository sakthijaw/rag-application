import type { SearchResult } from '../types'

/** Base URL — uses Vite proxy in dev; falls back to VITE_API_URL env var. */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
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
