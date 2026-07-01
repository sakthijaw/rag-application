import { useMutation } from '@tanstack/react-query'
import { searchComponents } from '../services/api'
import type { SearchResult } from '../types'

/**
 * Wraps the POST /api/search call with React Query's useMutation.
 * Provides isPending, isError, error, data, and the mutate function.
 */
export function useSearch() {
  return useMutation<SearchResult, Error, string>({
    mutationFn: searchComponents,
  })
}
