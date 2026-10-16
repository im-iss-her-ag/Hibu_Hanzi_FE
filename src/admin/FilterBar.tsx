import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { adminApi, type Filters, type Kind, type StatusFilter, type Std } from './api'

interface Props {
  filters: Filters
  onChange: (patch: Partial<Filters>) => void
}

const LEVELS = [1, 2, 3, 4, 5, 6, 7]

export function FilterBar({ filters, onChange }: Props) {
  const stats = useQuery({ queryKey: ['admin', 'stats', filters.std], queryFn: () => adminApi.stats(filters.std), staleTime: 0 })
  const levelStats = stats.data?.[filters.kind] ?? []
  const [q, setQ] = useState(filters.q)

  // Search after a short pause in typing, not on every key.
  useEffect(() => {
    const t = setTimeout(() => q !== filters.q && onChange({ q }), 300)
    return () => clearTimeout(t)
  }, [q, filters.q, onChange])

  const levels = filters.std === 'hsk2' ? LEVELS.slice(0, 6) : LEVELS

  return (
    <div className="adm-filters">
      <div className="adm-tabs" role="tablist" aria-label="Loại dữ liệu">
        {(['characters', 'words'] as Kind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={filters.kind === k}
            className="adm-tab"
            onClick={() => onChange({ kind: k })}
          >
            {k === 'characters' ? 'Chữ' : 'Từ'}
          </button>
        ))}
      </div>

      <div className="adm-levels" role="group" aria-label="Cấp độ">
        {levels.map((lv) => {
          const s = levelStats.find((x) => x.level === lv)
          const pct = s && s.total ? Math.round((s.reviewed / s.total) * 100) : 0
          return (
            <button
              key={lv}
              type="button"
              className="adm-level"
              aria-pressed={filters.level === lv}
              onClick={() => onChange({ level: lv })}
              title={s ? `${s.reviewed}/${s.total} đã duyệt` : undefined}
            >
              <span className="adm-level-name">{filters.std === 'hsk3' && lv === 7 ? 'HSK 7–9' : `HSK ${lv}`}</span>
              <span className="adm-level-count">{s ? `${s.reviewed}/${s.total}` : '…'}</span>
              <span className="adm-progress" aria-hidden>
                <span style={{ width: `${pct}%` }} />
              </span>
            </button>
          )
        })}
      </div>

      <div className="adm-filter-row">
        <label>
          Chuẩn
          <select value={filters.std} onChange={(e) => onChange({ std: e.target.value as Std, level: 1 })}>
            <option value="hsk3">HSK 3.0</option>
            <option value="hsk2">HSK 2.0</option>
          </select>
        </label>
        <label>
          Trạng thái
          <select value={filters.status} onChange={(e) => onChange({ status: e.target.value as StatusFilter })}>
            <option value="draft">Chưa duyệt</option>
            <option value="reviewed">Đã duyệt</option>
            <option value="all">Tất cả</option>
          </select>
        </label>
        <label className="adm-search">
          <Search size={16} aria-hidden />
          <span className="adm-sr">Tìm</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm chữ, pinyin, Hán Việt, nghĩa…"
          />
        </label>
      </div>
    </div>
  )
}
