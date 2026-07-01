import { useState, useCallback } from 'react'

interface UseCopyReturn {
  copied: boolean
  copy: (text: string) => Promise<void>
}

/** Copy text to the clipboard; `copied` stays true for `resetAfterMs`. */
export function useCopyToClipboard(resetAfterMs = 2000): UseCopyReturn {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), resetAfterMs)
      } catch {
        /* clipboard access denied — silently ignore */
      }
    },
    [resetAfterMs],
  )

  return { copied, copy }
}
