'use client'

import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [query])
  return matches
}

/** Tailwind `lg` breakpoint: below this the workspace uses drawer/sheet layout. */
export const MOBILE_QUERY = '(max-width: 1023px)'

export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY)
}

export function useIsTouch() {
  return useMediaQuery('(pointer: coarse)')
}
