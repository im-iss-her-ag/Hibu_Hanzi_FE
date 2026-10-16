import { useCallback, useEffect, useState } from 'react'
import type { Filters, Kind, StatusFilter, Std } from './api'

// Filters live in the URL so a reload, or a link sent to another reviewer, opens the same page.

function read(): Filters {
  const p = new URLSearchParams(window.location.search)
  const kind: Kind = p.get('kind') === 'words' ? 'words' : 'characters'
  const std: Std = p.get('std') === 'hsk2' ? 'hsk2' : 'hsk3'
  const status = p.get('status')
  const level = Number(p.get('level'))
  const page = Number(p.get('page'))
  return {
    kind,
    std,
    level: Number.isInteger(level) && level >= 1 && level <= 7 ? level : 1,
    status: status === 'reviewed' || status === 'all' ? (status as StatusFilter) : 'draft',
    q: p.get('q') ?? '',
    page: Number.isInteger(page) && page > 0 ? page : 0,
  }
}

function write(f: Filters) {
  const p = new URLSearchParams()
  p.set('kind', f.kind)
  p.set('std', f.std)
  p.set('level', String(f.level))
  p.set('status', f.status)
  if (f.q) p.set('q', f.q)
  if (f.page) p.set('page', String(f.page))
  window.history.replaceState(null, '', `${window.location.pathname}?${p}`)
}

export function useFilters() {
  const [filters, setFilters] = useState<Filters>(read)

  useEffect(() => write(filters), [filters])

  // Changing anything but the page goes back to the first page.
  const update = useCallback((patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch, page: 'page' in patch ? patch.page! : 0 }))
  }, [])

  return [filters, update] as const
}
