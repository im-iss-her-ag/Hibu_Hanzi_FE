import { useMemo } from 'react'
import { Target } from 'lucide-react'
import type { BundleCharacter } from '../core'
import { useLearnData } from '../learn/srs'
import { buildTodayPlan, useDaily, useNow } from '../learn/daily'

/** Header entry "Hôm nay": icon + label, with the number of things still to do today as a small badge. */
export function TodayEntry({ characters, active, onOpen }: { characters: BundleCharacter[]; active: boolean; onOpen: () => void }) {
  const learn = useLearnData()
  const daily = useDaily()
  const now = useNow()
  const left = useMemo(() => {
    const p = buildTodayPlan(learn, daily, characters, now)
    return p.newQueue.length + p.dueLeft
  }, [learn, daily, characters, now])
  const label = left > 0 ? `Học hôm nay: còn ${left} việc` : 'Học hôm nay'
  return (
    <button
      type="button"
      className={`sh-icon-btn rv-entry sh-today${active ? ' is-open' : ''}`}
      onClick={onOpen}
      title={`${label} (T)`}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      data-testid="nav-today"
    >
      <Target size={16} aria-hidden="true" />
      <span className="rv-entry-label sh-today-label" aria-hidden="true">Hôm nay</span>
      {left > 0 && <span className="rv-entry-count" aria-hidden="true">{left > 99 ? '99+' : left}</span>}
    </button>
  )
}
