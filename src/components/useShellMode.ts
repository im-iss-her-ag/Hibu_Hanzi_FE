import { useEffect, useState } from 'react'

// rail: >=1200 permanent column. drawer: 768-1199 left overlay. sheet: <768 bottom sheet.
export type ShellMode = 'rail' | 'drawer' | 'sheet'

const read = (): ShellMode => {
  if (typeof window === 'undefined') return 'rail'
  if (window.matchMedia('(min-width: 1200px)').matches) return 'rail'
  return window.matchMedia('(min-width: 768px)').matches ? 'drawer' : 'sheet'
}

export function useShellMode(): ShellMode {
  const [mode, setMode] = useState<ShellMode>(read)
  useEffect(() => {
    const queries = [window.matchMedia('(min-width: 1200px)'), window.matchMedia('(min-width: 768px)')]
    const update = () => setMode(read())
    queries.forEach((q) => q.addEventListener('change', update))
    update()
    return () => queries.forEach((q) => q.removeEventListener('change', update))
  }, [])
  return mode
}
