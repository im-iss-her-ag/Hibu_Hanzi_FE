import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, type AdminCharacter, type AdminWord, type CharacterInput, type Filters, type RowStatus, type WordInput } from './api'

type Row = { id: number; status: RowStatus }
type Page<T> = { total: number; items: T[] }

// One list page plus the actions on it. Results are written straight into the cached page,
// so a reviewed row stays where it is (greyed, with "Đã duyệt") instead of jumping away.
export function useAdminList<T extends Row>(filters: Filters) {
  const qc = useQueryClient()
  const key = ['admin', 'list', filters] as const

  const query = useQuery({
    queryKey: key,
    queryFn: () => adminApi.list<T>(filters),
    staleTime: 0,
    // Keep the old page on screen while the next one loads, but never across the
    // characters/words switch: a character row rendered as a word card would crash.
    placeholderData: (prev, prevQuery) => ((prevQuery?.queryKey[2] as Filters | undefined)?.kind === filters.kind ? prev : undefined),
  })

  const patch = (fn: (item: T) => T) =>
    qc.setQueryData<Page<T>>(key, (old) => old && { ...old, items: old.items.map(fn) })

  const refreshStats = () => qc.invalidateQueries({ queryKey: ['admin', 'stats'] })

  const review = useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: RowStatus }) => adminApi.review(filters.kind, ids, status),
    onSuccess: (res, { status }) => {
      const changed = new Set(res.changed)
      patch((item) => (changed.has(item.id) ? { ...item, status } : item))
      refreshStats()
    },
  })

  const saveCharacter = useMutation({
    mutationFn: ({ id, input }: { id: number; input: CharacterInput }) => adminApi.saveCharacter(id, input),
    onSuccess: (saved) => patch((item) => (item.id === saved.id ? (saved as unknown as T) : item)),
  })

  const saveWord = useMutation({
    mutationFn: ({ id, input }: { id: number; input: WordInput }) => adminApi.saveWord(id, input),
    onSuccess: (saved) => patch((item) => (item.id === saved.id ? (saved as unknown as T) : item)),
  })

  // Save, then optionally review in the same click ("Lưu & duyệt").
  async function save(id: number, input: CharacterInput | WordInput, andReview: boolean) {
    if (filters.kind === 'characters') await saveCharacter.mutateAsync({ id, input: input as CharacterInput })
    else await saveWord.mutateAsync({ id, input: input as WordInput })
    if (andReview) {
      const res = await review.mutateAsync({ ids: [id], status: 'reviewed' })
      if (res.refused.length) throw new Error('Đã lưu, nhưng chưa duyệt được: dòng này còn thiếu nội dung.')
    }
  }

  return { query, review, save }
}

export type CharacterList = ReturnType<typeof useAdminList<AdminCharacter>>
export type WordList = ReturnType<typeof useAdminList<AdminWord>>
