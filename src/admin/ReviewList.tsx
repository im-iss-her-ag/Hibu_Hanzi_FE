import { ChevronLeft, ChevronRight, CheckCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  AdminError,
  characterProblems,
  PAGE_SIZE,
  wordProblems,
  type AdminCharacter,
  type AdminWord,
  type CharacterInput,
  type Filters,
  type WordInput,
} from './api'
import { CharacterCard } from './CharacterCard'
import { useAdminList } from './useAdminList'
import { WordCard } from './WordCard'

interface Props {
  filters: Filters
  onPage: (page: number) => void
  onUnauthorized: () => void
}

type Item = AdminCharacter | AdminWord

export function ReviewList({ filters, onPage, onUnauthorized }: Props) {
  const { query, review, save } = useAdminList<Item>(filters)
  const [notice, setNotice] = useState<string | null>(null)
  const isChars = filters.kind === 'characters'
  const unauthorized = query.error instanceof AdminError && query.error.status === 401

  // A token revoked or changed on the server sends the reviewer back to the sign-in form.
  useEffect(() => {
    if (unauthorized) onUnauthorized()
  }, [unauthorized, onUnauthorized])

  if (unauthorized) return null
  if (query.isPending) {
    return (
      <div className="adm-list" aria-busy="true" aria-label="Đang tải">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="adm-card adm-skeleton" />
        ))}
      </div>
    )
  }
  if (query.isError) {
    return (
      <div className="adm-state" role="alert">
        <p>Không tải được danh sách: {query.error.message}</p>
        <button type="button" className="adm-btn" onClick={() => query.refetch()}>
          Thử lại
        </button>
      </div>
    )
  }

  const { total, items } = query.data
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const problemsOf = (it: Item) => (isChars ? characterProblems(it as AdminCharacter) : wordProblems(it as AdminWord))
  const ready = items.filter((it) => it.status === 'draft' && problemsOf(it).length === 0)

  async function reviewPage() {
    if (!window.confirm(`Duyệt ${ready.length} dòng đã đủ nội dung trên trang này?`)) return
    const res = await review.mutateAsync({ ids: ready.map((it) => it.id), status: 'reviewed' })
    setNotice(`Đã duyệt ${res.changed.length} dòng${res.refused.length ? `, ${res.refused.length} dòng chưa đủ nội dung` : ''}.`)
  }

  if (!items.length) {
    return (
      <div className="adm-state" role="status">
        <p>{filters.status === 'draft' ? 'Không còn gì cần duyệt ở bộ lọc này.' : 'Không có dòng nào khớp bộ lọc.'}</p>
      </div>
    )
  }

  const pager = (
    <nav className="adm-pager" aria-label="Phân trang">
      <button type="button" className="adm-icon-btn" onClick={() => onPage(filters.page - 1)} disabled={filters.page === 0} aria-label="Trang trước">
        <ChevronLeft size={16} aria-hidden />
      </button>
      <span>
        Trang {filters.page + 1}/{pages} · {total} dòng
      </span>
      <button type="button" className="adm-icon-btn" onClick={() => onPage(filters.page + 1)} disabled={filters.page + 1 >= pages} aria-label="Trang sau">
        <ChevronRight size={16} aria-hidden />
      </button>
    </nav>
  )

  return (
    <section aria-label={isChars ? 'Danh sách chữ' : 'Danh sách từ'}>
      <div className="adm-toolbar">
        {pager}
        <button type="button" className="adm-btn" onClick={reviewPage} disabled={!ready.length || review.isPending}>
          <CheckCheck size={16} aria-hidden /> Duyệt cả trang ({ready.length})
        </button>
      </div>
      {notice && (
        <p className="adm-notice" role="status">
          {notice}
        </p>
      )}

      <div className="adm-list" style={{ opacity: query.isPlaceholderData ? 0.6 : 1 }}>
        {items.map((it) =>
          isChars ? (
            <CharacterCard
              key={it.id}
              item={it as AdminCharacter}
              busy={review.isPending}
              onReview={(status) => review.mutate({ ids: [it.id], status })}
              onSave={(input: CharacterInput, andReview) => save(it.id, input, andReview)}
            />
          ) : (
            <WordCard
              key={it.id}
              item={it as AdminWord}
              busy={review.isPending}
              onReview={(status) => review.mutate({ ids: [it.id], status })}
              onSave={(input: WordInput, andReview) => save(it.id, input, andReview)}
            />
          ),
        )}
      </div>

      <div className="adm-toolbar adm-toolbar-bottom">{pager}</div>
    </section>
  )
}
