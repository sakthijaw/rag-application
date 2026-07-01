import { useState, useCallback } from 'react'
import type { SearchHistoryItem } from '../types'

const STORAGE_KEY = 'astro-rag:history'
const MAX_ITEMS   = 25

function loadFromStorage(): SearchHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SearchHistoryItem[]) : []
  } catch {
    return []
  }
}

function persist(items: SearchHistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* quota exceeded — silently skip */
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>(loadFromStorage)

  /** Add or update an entry for a completed search. */
  const addEntry = useCallback((entry: SearchHistoryItem) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.query.toLowerCase() !== entry.query.toLowerCase())
      const next = [entry, ...filtered].slice(0, MAX_ITEMS)
      persist(next)
      return next
    })
  }, [])

  /** Remove one history entry by id. */
  const removeEntry = useCallback((id: string) => {
    setHistory(prev => {
      const next = prev.filter(h => h.id !== id)
      persist(next)
      return next
    })
  }, [])

  /** Wipe the entire history. */
  const clearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { history, addEntry, removeEntry, clearHistory }
}
