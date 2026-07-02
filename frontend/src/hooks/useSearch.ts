import { useMutation } from '@tanstack/react-query'
import { useRef, useCallback } from 'react'
import { searchComponents } from '../services/api'
import type { SearchResult } from '../types'

/**
 * Wraps the POST /api/search call with React Query's useMutation.
 * Provides isPending, isError, error, data, and the mutate function.
 * Prevents duplicate concurrent requests for the same query.
 */
export function useSearch() {
  const inflightQuery = useRef<string | null>(null)

  const mutation = useMutation<SearchResult, Error, string>({
    mutationFn: async (query: string) => {
      // Prevent duplicate concurrent requests
      if (inflightQuery.current === query) {
        throw new Error('__DUPLICATE__')
      }
      inflightQuery.current = query
      try {
        return await searchComponents(query)
      } finally {
        inflightQuery.current = null
      }
    },
  })

  const search = useCallback(
    (query: string) => {
      if (inflightQuery.current === query) return mutation.mutateAsync(query)
      return mutation.mutateAsync(query)
    },
    [mutation],
  )

  return {
    ...mutation,
    search,
    /** true while a request is inflight */
    isSearching: mutation.isPending,
  }
}
