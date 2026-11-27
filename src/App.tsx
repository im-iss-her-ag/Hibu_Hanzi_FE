import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { BundleCharacter, HskLevel, LevelFilter } from './core'
import {
  charactersWithRadical,
  containedForms,
  findFamily,
  getLocalBundle,
  pickRandom,
  RADICAL_CHARACTERS,
  radicalFamilies,
} from './core'
import { api } from './api'
import { Navbar } from './components/Navbar'
import { LeftSidebar } from './components/LeftSidebar'
import { StudioCenter } from './components/StudioCenter'
import { RightBreakdown } from './components/RightBreakdown'
import { SearchModal } from './components/SearchModal'
import { HanVietQuiz } from './components/HanVietQuiz'
import type { QuizScope } from './learn/hanVietQuiz'
import { FavoritesModal } from './components/FavoritesModal'
import { PinyinChartModal } from './components/PinyinChartModal'
import { PronunciationModal } from './components/PronunciationModal'
import { ToneTrainer } from './components/ToneTrainer'
import { normalizeFolded } from './utils/search'
import { PipWidget } from './components/PipWidget'
import { Rail } from './components/Rail'
import { ReviewSession } from './components/ReviewSession'
import { BackupModal } from './components/BackupModal'
import { toggleKnown } from './learn/srs'
import { StudyNav } from './components/StudyNav'
import { EmptyState, ErrorState, RailSkeleton, SheetSkeleton } from './components/ShellStates'
import { useShellMode } from './components/useShellMode'
import { orderRadicalFamilies } from './utils/radicalOrder'
import { buildCharacterUrl, getSavedLevelFallback, parseRouteFromUrl } from './utils/routing'

export interface HistoryEntry {
  hanzi: string
  level: LevelFilter
  word?: string | null
}

export function App() {
  // Query full bundle (server or local offline dataset)
  const bundle = useQuery({
    queryKey: ['bundle'],
    queryFn: () => api.getBundle(),
    // Render immediately from the built-in dataset while the server copy loads. placeholderData (not
    // initialData): it never enters the cache, so with staleTime: Infinity the real fetch still runs.
    placeholderData: () => getLocalBundle(),
    // getBundle() swallows network errors (rate limit, offline) and returns the sample with
    // offline: true. Keep retrying in the background so the real data replaces it on its own.
    refetchInterval: (query) => (query.state.data?.offline ? 15_000 : false),
  })
  const usingSample = bundle.data?.offline === true

  const allCharacters = useMemo(() => bundle.data?.characters ?? [], [bundle.data?.characters])
  const allWords = useMemo(() => bundle.data?.words ?? [], [bundle.data?.words])
  const contained = useMemo(() => containedForms(allCharacters), [allCharacters])
  const families = useMemo(
    () => radicalFamilies(allCharacters, bundle.data?.components ?? [], contained),
    [allCharacters, bundle.data?.components, contained],
  )

  // Radical-mode pool: one entry per family, in the library's visual order (display form)
  const radicalFamiliesOrdered = useMemo(() => orderRadicalFamilies(families), [families])
  const radicalPool = useMemo<BundleCharacter[]>(
    () =>
      radicalFamiliesOrdered.map(
        (f) =>
          allCharacters.find((c) => c.hanzi === f.display) ??
          RADICAL_CHARACTERS.find((c) => c.hanzi === f.display) ?? {
            hanzi: f.display,
            traditional: null,
            radical: null,
            parts: [],
            hsk2Level: null,
            hsk3Level: null,
            readings: [],
          },
      ),
    [radicalFamiliesOrdered, allCharacters],
  )

  // Initial route parsed once from URL (?c=...&level=...)
  const initialRouteRef = useRef(parseRouteFromUrl())
  const hasInitializedUrlRef = useRef(false)

  // Filters & State (HSK 1-6 hoặc Tab 'radicals' Bộ thủ)
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>(
    () => initialRouteRef.current.level ?? getSavedLevelFallback(),
  )
  const [activeWord, setActiveWord] = useState<string | null>(() => initialRouteRef.current.word)
  const [currentHanzi, setCurrentHanzi] = useState<string | null>(
    () => initialRouteRef.current.hanzi,
  )

  // Inside the radicals tab: the radical family whose characters are listed (null = list radicals).
  const [radicalKey, setRadicalKey] = useState<string | null>(null)
  const activeFamily = useMemo(() => families.find((f) => f.key === radicalKey) ?? null, [families, radicalKey])

  // In-app navigation history synchronized with browser History API
  const [historyStack, setHistoryStack] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const historyStackRef = useRef<HistoryEntry[]>([])
  const historyIndexRef = useRef<number>(-1)
  historyStackRef.current = historyStack
  historyIndexRef.current = historyIndex

  // Modals
  const [showSearch, setShowSearch] = useState<boolean>(false)
  const [showFavorites, setShowFavorites] = useState<boolean>(false)
  const [showPinyinChart, setShowPinyinChart] = useState<boolean>(false)
  const [showReview, setShowReviewState] = useState<boolean>(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'review',
  )
  const [showBackup, setShowBackup] = useState<boolean>(false)
  /** Tone trainer: explicit target (word / pinyin chart) or null fields = follow the active character. */
  const [toneTrainer, setToneTrainer] = useState<{ mode: 'char' | 'free'; hanzi?: string; pinyin?: string; hanViet?: string | null } | null>(null)
  // ?mode=review deep-links straight into a review session.
  const setShowReview = useCallback((open: boolean) => {
    setShowReviewState(open)
    const url = new URL(window.location.href)
    if (open) url.searchParams.set('mode', 'review')
    else url.searchParams.delete('mode')
    window.history.replaceState(window.history.state, '', url)
  }, [])
  const [pronounceTarget, setPronounceTarget] = useState<string | null>(null)

  // Character list: a permanent rail (>=1200, collapsible), a drawer (768-1199) or a bottom sheet (<768).
  const shellMode = useShellMode()
  const overlayList = shellMode !== 'rail'
  const [listOpen, setListOpen] = useState(false)
  const [railCollapsed, setRailCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hibu_rail_collapsed') === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('hibu_rail_collapsed', railCollapsed ? '1' : '0')
    } catch {
      // ignore
    }
  }, [railCollapsed])
  // Crossing a breakpoint resets the overlay so it never lingers across layouts.
  useEffect(() => setListOpen(false), [shellMode])
  const closeList = useCallback(() => setListOpen(false), [])
  const openList = useCallback(() => {
    if (shellMode === 'rail') setRailCollapsed(false)
    else setListOpen(true)
  }, [shellMode])
  const toggleList = useCallback(() => {
    if (shellMode === 'rail') setRailCollapsed((v) => !v)
    else setListOpen((v) => !v)
  }, [shellMode])
  const mainRef = useRef<HTMLElement>(null)

  // Display mode
  const [displayMode, setDisplayMode] = useState<'modern' | 'components'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hibu_display_mode')
      if (saved === 'modern' || saved === 'components') return saved
    }
    return 'modern'
  })

  // Theme mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('hibu_theme')
      if (savedTheme) {
        return savedTheme === 'dark'
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  // With no stored choice, keep following the system theme (live)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('hibu_theme')) setIsDarkMode(e.matches)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Only an explicit toggle is persisted
  const toggleDarkMode = () =>
    setIsDarkMode((prev) => {
      localStorage.setItem('hibu_theme', prev ? 'light' : 'dark')
      return !prev
    })

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hibu_favorites')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return []
        }
      }
    }
    return []
  })

  useEffect(() => {
    localStorage.setItem('hibu_favorites', JSON.stringify(favorites))
  }, [favorites])

  // Filter pool based on HSK 3.0 level (1-6) or Radicals
  const filteredCharacters = useMemo(() => {
    if (selectedLevel === 'radicals') {
      return activeFamily ? charactersWithRadical(allCharacters, activeFamily, contained) : radicalPool
    }
    return allCharacters.filter((c) => c.hsk3Level === selectedLevel)
  }, [allCharacters, selectedLevel, activeFamily, contained, radicalPool])

  // Resolve target level & canonical character for any hanzi
  const resolveTarget = useCallback(
    (h: string, preferredLevel?: LevelFilter): { hanzi: string; level: LevelFilter } => {
      if (preferredLevel === 'radicals' && families.some((f) => f.forms.includes(h))) {
        return { hanzi: h, level: 'radicals' }
      }
      if (preferredLevel !== undefined) {
        const pool =
          preferredLevel === 'radicals'
            ? RADICAL_CHARACTERS
            : allCharacters.filter((c) => c.hsk3Level === preferredLevel)
        const inPreferred = pool.find((c) => c.hanzi === h || c.traditional === h)
        if (inPreferred) {
          return { hanzi: inPreferred.hanzi, level: preferredLevel }
        }
      }

      const inCurrent = filteredCharacters.find((c) => c.hanzi === h || c.traditional === h)
      if (inCurrent) {
        return { hanzi: inCurrent.hanzi, level: selectedLevel }
      }

      const foundInHsk = allCharacters.find((c) => c.hanzi === h || c.traditional === h)
      if (foundInHsk) {
        const lvl =
          foundInHsk.hsk3Level && foundInHsk.hsk3Level >= 1 && foundInHsk.hsk3Level <= 6
            ? (foundInHsk.hsk3Level as HskLevel)
            : selectedLevel
        return { hanzi: foundInHsk.hanzi, level: lvl }
      }

      const foundInRadicals = RADICAL_CHARACTERS.find((r) => r.hanzi === h)
      if (foundInRadicals) {
        return { hanzi: foundInRadicals.hanzi, level: 'radicals' }
      }

      return { hanzi: h, level: selectedLevel }
    },
    [allCharacters, filteredCharacters, selectedLevel, families],
  )

  // Active character
  const activeChar: BundleCharacter | null = useMemo(() => {
    if (currentHanzi) {
      const inPool = filteredCharacters.find(
        (c) => c.hanzi === currentHanzi || c.traditional === currentHanzi,
      )
      if (inPool) return inPool

      const inAll = allCharacters.find(
        (c) => c.hanzi === currentHanzi || c.traditional === currentHanzi,
      )
      if (inAll) return inAll

      const inRadicals = RADICAL_CHARACTERS.find((r) => r.hanzi === currentHanzi)
      if (inRadicals) return inRadicals

      return {
        hanzi: currentHanzi,
        traditional: null,
        radical: null,
        parts: [],
        hsk2Level: null,
        hsk3Level: null,
        readings: [],
      }
    }
    return filteredCharacters[0] ?? null
  }, [filteredCharacters, allCharacters, currentHanzi])

  const currentIndex = useMemo(() => {
    if (!activeChar) return 0
    if (selectedLevel === 'radicals' && !activeFamily) {
      const fi = radicalFamiliesOrdered.findIndex((f) => f.forms.includes(activeChar.hanzi))
      return fi >= 0 ? fi : 0
    }
    const idx = filteredCharacters.findIndex((c) => c.hanzi === activeChar.hanzi)
    return idx >= 0 ? idx : 0
  }, [filteredCharacters, activeChar, selectedLevel, activeFamily, radicalFamiliesOrdered])

  // Core navigation helper: keeps React state, URL query, and browser History in sync
  const navigateTo = useCallback(
    (hanzi: string, level: LevelFilter, historyMode: 'push' | 'replace' = 'push', word: string | null = null) => {
      const currentUrlEntry = parseRouteFromUrl()
      const isSameAsState = currentHanzi === hanzi && selectedLevel === level && activeWord === word
      const isSameAsUrl =
        currentUrlEntry.hanzi === hanzi && currentUrlEntry.level === level && currentUrlEntry.word === word

      setActiveWord(word)
      setSelectedLevel(level)
      setCurrentHanzi(hanzi)
      if (level !== 'radicals') {
        setRadicalKey(null)
      }

      if (typeof window === 'undefined') return
      const nextUrl = buildCharacterUrl(hanzi, level, word)

      if (historyMode === 'replace') {
        const baseStack =
          historyStackRef.current.length > 0
            ? [...historyStackRef.current]
            : [{ hanzi, level, word }]
        const idx = Math.max(0, historyIndexRef.current)
        baseStack[idx] = { hanzi, level, word }
        setHistoryStack(baseStack)
        setHistoryIndex(idx)
        window.history.replaceState({ idx, hanzi, level, word }, '', nextUrl)
        return
      }

      if (isSameAsState && isSameAsUrl) return

      const base = historyStackRef.current.slice(0, historyIndexRef.current + 1)
      const last = base[base.length - 1]
      if (last && last.hanzi === hanzi && last.level === level && (last.word ?? null) === word) return

      const nextStack = [...base, { hanzi, level, word }].slice(-30)
      const nextIdx = nextStack.length - 1
      setHistoryStack(nextStack)
      setHistoryIndex(nextIdx)
      window.history.pushState({ idx: nextIdx, hanzi, level, word }, '', nextUrl)
    },
    [currentHanzi, selectedLevel, activeWord],
  )

  const changeLevel = useCallback((lvl: LevelFilter) => {
    setSelectedLevel(lvl)
    setRadicalKey(null)
    const nextPool =
      lvl === 'radicals' ? radicalPool : allCharacters.filter((c) => c.hsk3Level === lvl)
    if (nextPool[0]) {
      navigateTo(nextPool[0].hanzi, lvl, 'push')
    }
  }, [allCharacters, navigateTo, radicalPool])

  const browseRadical = useCallback(
    (form: string | null) => {
      const family = form ? findFamily(families, form) : null
      setSelectedLevel('radicals')
      setRadicalKey(family?.key ?? null)
      if (family) {
        const pool = charactersWithRadical(allCharacters, family, contained)
        if (pool[0]) {
          navigateTo(pool[0].hanzi, 'radicals', 'push')
          return
        }
      }
      setCurrentHanzi(null)
    },
    [families, allCharacters, contained, navigateTo],
  )

  // Initialize canonical URL & first history entry once bundle finishes loading
  useEffect(() => {
    if (!bundle.isSuccess || hasInitializedUrlRef.current) return
    const route = initialRouteRef.current

    if (route.hanzi) {
      const resolved = resolveTarget(route.hanzi, route.level ?? undefined)
      hasInitializedUrlRef.current = true
      navigateTo(resolved.hanzi, resolved.level, 'replace', route.word)
    } else if (filteredCharacters[0]) {
      hasInitializedUrlRef.current = true
      navigateTo(filteredCharacters[0].hanzi, selectedLevel, 'replace')
    }
  }, [bundle.isSuccess, filteredCharacters, selectedLevel, resolveTarget, navigateTo])

  // Handle Browser Back / Forward (popstate)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as { idx?: number; hanzi?: string; level?: LevelFilter } | null
      const parsed = parseRouteFromUrl()
      const targetHanzi = state?.hanzi ?? parsed.hanzi
      const targetLevel = state?.level ?? parsed.level

      if (targetHanzi) {
        const resolved = resolveTarget(targetHanzi, targetLevel ?? undefined)
        setSelectedLevel(resolved.level)
        setCurrentHanzi(resolved.hanzi)
        setActiveWord(parsed.word)

        if (typeof state?.idx === 'number') {
          setHistoryIndex(
            Math.max(0, Math.min(state.idx, Math.max(0, historyStackRef.current.length - 1))),
          )
        } else {
          const matchIdx = historyStackRef.current.findIndex(
            (item) => item.hanzi === resolved.hanzi && item.level === resolved.level,
          )
          if (matchIdx >= 0) setHistoryIndex(matchIdx)
        }
      } else if (targetLevel) {
        setActiveWord(null)
        setSelectedLevel(targetLevel)
        const pool =
          targetLevel === 'radicals'
            ? radicalPool
            : allCharacters.filter((c) => c.hsk3Level === targetLevel)
        if (pool[0]) setCurrentHanzi(pool[0].hanzi)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [allCharacters, resolveTarget, radicalPool])

  // Sync document.title with active character so browser history dropdown shows character names
  useEffect(() => {
    if (!activeChar) {
      document.title = 'Hibu Hanzi · Học Hán Tự & Chiết Tự'
      return
    }
    const primary = activeChar.readings.find((r) => r.isPrimary) ?? activeChar.readings[0]
    const parts = [activeChar.hanzi]
    if (primary?.pinyin) parts.push(primary.pinyin)
    if (primary?.hanViet) parts.push(primary.hanViet.toUpperCase())
    document.title = `${parts.join(' · ')} — Hibu Hanzi`
  }, [activeChar])

  // Smart character navigation: automatically switch level if the character or radical belongs to another level
  const handleSelectHanzi = useCallback(
    (h: string) => {
      const resolved = resolveTarget(h)
      navigateTo(resolved.hanzi, resolved.level, 'push')
    },
    [resolveTarget, navigateTo],
  )

  // Word context: a word picked from search / Từ ghép keeps its banner while browsing its characters
  const handleSelectWord = useCallback(
    (word: string) => {
      const chars = Array.from(word)
      const first = (activeChar && chars.includes(activeChar.hanzi) ? activeChar.hanzi : chars[0]) ?? word
      const resolved = resolveTarget(first)
      navigateTo(resolved.hanzi, resolved.level, 'push', word)
    },
    [resolveTarget, navigateTo, activeChar],
  )
  const handleSelectWordChar = useCallback(
    (h: string) => {
      const resolved = resolveTarget(h)
      navigateTo(resolved.hanzi, resolved.level, 'push', activeWord)
    },
    [resolveTarget, navigateTo, activeWord],
  )
  const handleDismissWord = useCallback(() => {
    if (activeChar) navigateTo(activeChar.hanzi, selectedLevel, 'replace', null)
  }, [activeChar, selectedLevel, navigateTo])
  const wordInfo = useMemo(() => {
    if (!activeWord) return null
    const w = allWords.find((x) => x.word === activeWord || x.traditional === activeWord)
    return w ?? { word: activeWord, pinyin: '', hanViet: null, meaningVi: '' }
  }, [activeWord, allWords])

  // In-app Back action (keeps browser Back/Forward synchronized)
  const canGoBack = historyIndex > 0
  const previousEntry = canGoBack ? historyStack[historyIndex - 1] : null
  const recentTrail = useMemo(() => {
    if (historyIndex <= 0) return []
    return historyStack.slice(Math.max(0, historyIndex - 3), historyIndex + 1)
  }, [historyStack, historyIndex])

  const recentHanzi = useMemo(() => {
    const out: string[] = []
    for (let i = historyStack.length - 1; i >= 0 && out.length < 8; i--) {
      const h = historyStack[i].hanzi
      if (h !== activeChar?.hanzi && !out.includes(h)) out.push(h)
    }
    return out
  }, [historyStack, activeChar?.hanzi])

  const handleGoBack = useCallback(() => {
    if (!canGoBack) return
    window.history.back()
  }, [canGoBack])

  // Pick random other character
  const pickNextRandom = useCallback(() => {
    if (filteredCharacters.length <= 1) return
    const others = filteredCharacters.filter((c) => c.hanzi !== activeChar?.hanzi)
    const picked = pickRandom(others.length > 0 ? others : filteredCharacters)
    if (picked) {
      navigateTo(picked.hanzi, selectedLevel, 'push')
    }
  }, [filteredCharacters, activeChar, selectedLevel, navigateTo])

  // Next / Prev sequentially
  const handleNext = useCallback(() => {
    if (filteredCharacters.length === 0) return
    const nextIdx = (currentIndex + 1) % filteredCharacters.length
    navigateTo(filteredCharacters[nextIdx].hanzi, selectedLevel, 'push')
  }, [filteredCharacters, currentIndex, selectedLevel, navigateTo])

  const handlePrev = useCallback(() => {
    if (filteredCharacters.length === 0) return
    const prevIdx = (currentIndex - 1 + filteredCharacters.length) % filteredCharacters.length
    navigateTo(filteredCharacters[prevIdx].hanzi, selectedLevel, 'push')
  }, [filteredCharacters, currentIndex, selectedLevel, navigateTo])

  // Up / down move one row in the left grid; the sidebar reports how many columns it shows.
  const [gridCols, setGridCols] = useState(5)
  const [gridPerPage, setGridPerPage] = useState(30)
  const handleGridChange = useCallback((cols: number, perPage: number) => {
    setGridCols(cols)
    setGridPerPage(perPage)
  }, [])
  const handleRow = useCallback(
    (dir: 1 | -1) => {
      const idx = currentIndex + dir * gridCols
      if (idx < 0 || idx >= filteredCharacters.length) return
      navigateTo(filteredCharacters[idx].hanzi, selectedLevel, 'push')
    },
    [filteredCharacters, currentIndex, gridCols, selectedLevel, navigateTo],
  )

  const handlePage = useCallback(
    (dir: 1 | -1) => {
      const page = Math.floor(currentIndex / gridPerPage) + dir
      const idx = page * gridPerPage
      if (page < 0 || idx >= filteredCharacters.length) return
      navigateTo(filteredCharacters[idx].hanzi, selectedLevel, 'push')
    },
    [filteredCharacters, currentIndex, gridPerPage, selectedLevel, navigateTo],
  )

  // Toggle favorite
  const handleToggleFavorite = useCallback(() => {
    if (!activeChar) return
    const hanzi = activeChar.hanzi
    setFavorites((prev) =>
      prev.includes(hanzi) ? prev.filter((h) => h !== hanzi) : [...prev, hanzi],
    )
  }, [activeChar])

  // Query character detail (chiet tu, components, compounds)
  const detailQuery = useQuery({
    queryKey: ['detail', activeChar?.hanzi],
    queryFn: () => (activeChar ? api.getCharacter(activeChar.hanzi) : null),
    enabled: Boolean(activeChar),
  })

  const toggleDisplayMode = useCallback(() => {
    setDisplayMode((prev) => {
      const next = prev === 'modern' ? 'components' : 'modern'
      try {
        localStorage.setItem('hibu_display_mode', next)
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  // Example character for the pronunciation guide: lowest-HSK character whose reading matches the
  // syllable (ignoring tone); a syllable that merely ends with it (a final like "ang") is the fallback.
  const pronounceExample = useMemo(() => {
    if (pronounceTarget === null) return null
    const want = normalizeFolded(pronounceTarget)
    let best: { rank: number; hanzi: string; r: BundleCharacter['readings'][number] } | null = null
    for (const c of allCharacters) {
      for (const r of c.readings) {
        const py = normalizeFolded(r.pinyin)
        const rank = (py === want ? 0 : py.endsWith(want) ? 10 : 99) + (c.hsk3Level ?? 7)
        if (rank < 99 && (!best || rank < best.rank)) best = { rank, hanzi: c.hanzi, r }
      }
    }
    if (best) return { hanzi: best.hanzi, pinyin: best.r.pinyin, hanViet: best.r.hanViet, meaningVi: best.r.meaningVi }
    return { hanzi: '', pinyin: pronounceTarget, hanViet: null, meaningVi: null }
  }, [pronounceTarget, allCharacters])

  const [quizScope, setQuizScope] = useState<QuizScope | null>(null)
  const modalOpen = quizScope !== null || showSearch || showFavorites || showPinyinChart || pronounceTarget !== null || showReview || showBackup || toneTrainer !== null

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return
      }

      if (e.key === 'Escape') {
        setShowSearch(false)
        setShowFavorites(false)
        setShowPinyinChart(false)
        setPronounceTarget(null)
        setListOpen(false)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (!modalOpen) setShowSearch(true)
        return
      }

      if (e.key === 'Backspace' && canGoBack && !modalOpen) {
        e.preventDefault()
        handleGoBack()
        return
      }

      if (modalOpen || e.altKey) return

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault()
          handlePage(e.key === 'ArrowRight' ? 1 : -1)
        }
        return
      }

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const actions: Record<string, () => void> = {
        ArrowRight: handleNext,
        d: handleNext,
        ArrowLeft: handlePrev,
        a: handlePrev,
        ArrowDown: () => handleRow(1),
        s: () => handleRow(1),
        ArrowUp: () => handleRow(-1),
        w: () => handleRow(-1),
        ' ': pickNextRandom,
        m: toggleDisplayMode,
        f: () => setShowSearch(true),
        g: handleToggleFavorite,
        k: () => activeChar && toggleKnown(activeChar.hanzi),
        r: () => setShowReview(true),
        b: () => changeLevel('radicals'),
        p: () => setShowPinyinChart((prev) => !prev),
        l: toggleList,
        v: () => setToneTrainer({ mode: 'char' }),
      }
      for (const n of [1, 2, 3, 4, 5, 6] as const) actions[String(n)] = () => changeLevel(n)

      const action = actions[key]
      if (!action || (key === 'Tab' && e.shiftKey)) return
      // Không chiếm Tab/Space khi đang focus vào control: giữ điều hướng bàn phím chuẩn
      const focused = document.activeElement
      const onControl = focused && focused !== document.body && focused.closest('button, a, [role="button"], [role="tab"], [tabindex]')
      if (onControl && (key === 'Tab' || key === ' ')) return
      e.preventDefault()
      action()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    modalOpen,
    canGoBack,
    handleGoBack,
    handleNext,
    handlePrev,
    handleRow,
    handlePage,
    pickNextRandom,
    handleToggleFavorite,
    toggleDisplayMode,
    changeLevel,
    toggleList,
    activeChar,
    setShowReview,
  ])

  // A new character starts at the top of the page.
  const activeHanzi = activeChar?.hanzi
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [activeHanzi])

  // Check if any modal or overlay is currently active
  const isModalActive = Boolean(
    showSearch || showFavorites || showPinyinChart || pronounceTarget !== null || showReview || showBackup || (overlayList && listOpen),
  )

  // Mobile horizontal swipe gestures: restricted to the hero card
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null
    if (
      isModalActive ||
      !target?.closest('.sheet') ||
      target?.closest('button, a, input, canvas, svg, [role="dialog"]')
    ) {
      touchStartXRef.current = null
      touchStartYRef.current = null
      return
    }
    touchStartXRef.current = e.touches[0].clientX
    touchStartYRef.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isModalActive || touchStartXRef.current === null || touchStartYRef.current === null) {
      touchStartXRef.current = null
      touchStartYRef.current = null
      return
    }
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchEndX - touchStartXRef.current
    const deltaY = touchEndY - touchStartYRef.current

    if (Math.abs(deltaX) > 75 && Math.abs(deltaX) > Math.abs(deltaY) * 2.2) {
      if (deltaX < 0) {
        handleNext()
      } else {
        handlePrev()
      }
    }
    touchStartXRef.current = null
    touchStartYRef.current = null
  }

  const selectFromList = (h: string) => {
    handleSelectHanzi(h)
    if (overlayList) setListOpen(false)
  }
  const loaded = !bundle.isLoading && !bundle.isError

  return (
    <div className="app-shell">
      <Navbar
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        displayMode={displayMode}
        onToggleDisplayMode={toggleDisplayMode}
        favoritesCount={favorites.length}
        onOpenFavorites={() => setShowFavorites(true)}
        onOpenSearch={() => setShowSearch(true)}
        onOpenPinyinChart={() => setShowPinyinChart(true)}
        onOpenReview={() => setShowReview(true)}
        onOpenBackup={() => setShowBackup(true)}
        onOpenToneTrainer={() => setToneTrainer({ mode: 'free' })}
        onOpenQuiz={() => setQuizScope(typeof selectedLevel === 'number' ? { kind: 'level', level: selectedLevel } : { kind: 'learned', maxLevel: 6 })}
        showListButton={shellMode === 'drawer' || (shellMode === 'rail' && railCollapsed)}
        listOpen={overlayList ? listOpen : !railCollapsed}
        onOpenList={openList}
        widget={
          bundle.isSuccess && (
            <PipWidget characters={allCharacters} favorites={favorites} onCharacterChange={handleSelectHanzi} />
          )
        }
      />

      <div className="app-body" data-mode={shellMode} data-collapsed={shellMode === 'rail' && railCollapsed}>
        <Rail
          mode={shellMode}
          open={listOpen}
          collapsed={railCollapsed}
          onClose={closeList}
          onCollapse={() => setRailCollapsed(true)}
        >
          {loaded ? (
            <LeftSidebar
              characters={allCharacters}
              activeHanzi={activeChar?.hanzi ?? null}
              onSelectHanzi={selectFromList}
              selectedLevel={selectedLevel}
              onLevelChange={changeLevel}
              favorites={favorites}
              families={families}
              activeFamily={activeFamily}
              radicalCharacters={activeFamily ? filteredCharacters : null}
              onBrowseRadical={browseRadical}
              onGridChange={handleGridChange}
            />
          ) : (
            <RailSkeleton />
          )}
        </Rail>

        <div className="main-col">
          <main
            id="main"
            className="main-scroll"
            ref={mainRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {usingSample && !bundle.isLoading && (
              <div className="sample-notice" role="status">
                <span>
                  Chưa kết nối được máy chủ nên đang hiện bộ chữ mẫu. Ứng dụng tự thử lại sau mỗi 15 giây.
                </span>
                <button type="button" onClick={() => bundle.refetch()} disabled={bundle.isFetching}>
                  {bundle.isFetching ? 'Đang thử…' : 'Thử lại'}
                </button>
              </div>
            )}
            {bundle.isLoading ? (
              <SheetSkeleton />
            ) : bundle.isError ? (
              <ErrorState message={String(bundle.error)} onRetry={() => bundle.refetch()} />
            ) : activeChar ? (
              <div className="sheet">
                <StudioCenter
                  character={activeChar}
                  detail={detailQuery.data ?? null}
                  currentIndex={currentIndex}
                  totalCount={filteredCharacters.length}
                  selectedLevel={selectedLevel}
                  isFavorite={favorites.includes(activeChar.hanzi)}
                  displayMode={displayMode}
                  onToggleFavorite={handleToggleFavorite}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  onRandom={pickNextRandom}
                  previousEntry={previousEntry}
                  recentTrail={recentTrail}
                  onGoBack={handleGoBack}
                  onSelectTrailEntry={(entry) => navigateTo(entry.hanzi, entry.level, 'push')}
                  onOpenMobileList={openList}
                  wordInfo={wordInfo}
                  onSelectWordChar={handleSelectWordChar}
                  onDismissWord={handleDismissWord}
                  allCharacters={allCharacters}
                  onSelectHomophone={handleSelectHanzi}
                  onOpenToneTrainer={() =>
                    setToneTrainer(
                      wordInfo && wordInfo.word.length > 1
                        ? { mode: 'char', hanzi: wordInfo.word, pinyin: wordInfo.pinyin, hanViet: wordInfo.hanViet }
                        : { mode: 'char' },
                    )
                  }
                />
                <RightBreakdown
                  detail={detailQuery.data ?? null}
                  isLoading={detailQuery.isLoading}
                  onSelectHanzi={handleSelectHanzi}
                  onSelectWord={handleSelectWord}
                  displayMode={displayMode}
                  characters={allCharacters}
                  families={families}
                  onBrowseRadical={browseRadical}
                  allWords={allWords}
                  onQuizWords={(hanzi) => setQuizScope({ kind: 'char', hanzi })}
                />
              </div>
            ) : (
              <EmptyState
                message={
                  selectedLevel === 'radicals' && !activeFamily
                    ? 'Chọn một bộ thủ trong danh sách để xem các chữ chứa bộ đó.'
                    : 'Không có chữ Hán nào phù hợp trong danh mục này.'
                }
                actionLabel="Quay về Cấp 1"
                onAction={() => changeLevel(1)}
              />
            )}
          </main>

          <StudyNav
            onPrev={handlePrev}
            onNext={handleNext}
            onRandom={pickNextRandom}
            onOpenList={openList}
            listOpen={overlayList ? listOpen : !railCollapsed}
            index={currentIndex}
            total={loaded && activeChar ? filteredCharacters.length : 0}
            disabled={!loaded || filteredCharacters.length === 0}
          />
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <SearchModal
          characters={allCharacters}
          words={allWords}
          recent={recentHanzi}
          families={families}
          onBrowseRadical={(form) => {
            browseRadical(form)
            setShowSearch(false)
          }}
          onSelectHanzi={(h) => {
            handleSelectHanzi(h)
            setShowSearch(false)
          }}
          onSelectWord={(w) => {
            handleSelectWord(w)
            setShowSearch(false)
          }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {showReview && loaded && (
        <ReviewSession
          characters={allCharacters}
          onClose={() => setShowReview(false)}
          onOpenCharacter={(h) => {
            setShowReview(false)
            handleSelectHanzi(h)
          }}
        />
      )}
      {showBackup && (
        <BackupModal favorites={favorites} onFavoritesChange={setFavorites} onClose={() => setShowBackup(false)} />
      )}

      {/* Favorites Modal */}
      {showFavorites && (
        <FavoritesModal
          favorites={favorites}
          characters={allCharacters}
          onSelectHanzi={(h) => {
            handleSelectHanzi(h)
            setShowFavorites(false)
          }}
          onRemoveFavorite={(h) =>
            setFavorites((prev) => prev.filter((item) => item !== h))
          }
          onClearAll={() => setFavorites([])}
          onClose={() => setShowFavorites(false)}
        />
      )}

      {/* Comprehensive Pinyin Chart Modal */}
      {showPinyinChart && (
        <PinyinChartModal
          onInspectPinyin={(pinyin) => {
            setShowPinyinChart(false)
            setPronounceTarget(pinyin)
          }}
          onClose={() => setShowPinyinChart(false)}
        />
      )}

      {quizScope && (
        <HanVietQuiz
          words={allWords}
          characters={allCharacters}
          initialScope={quizScope}
          selectedLevel={typeof selectedLevel === 'number' ? selectedLevel : null}
          favorites={favorites}
          onSelectWord={handleSelectWord}
          onClose={() => setQuizScope(null)}
        />
      )}

      {/* Pronunciation guide for a syllable picked in the pinyin chart */}
      {pronounceTarget !== null && pronounceExample && (
        <PronunciationModal
          hanzi={pronounceExample.hanzi}
          pinyin={pronounceExample.pinyin}
          hanViet={pronounceExample.hanViet}
          meaningVi={pronounceExample.meaningVi}
          onClose={() => setPronounceTarget(null)}
          onPractice={() => {
            setToneTrainer({ mode: 'char', hanzi: pronounceExample.hanzi, pinyin: pronounceExample.pinyin, hanViet: pronounceExample.hanViet })
            setPronounceTarget(null)
          }}
        />
      )}

      {toneTrainer && (() => {
        const primary = activeChar ? (activeChar.readings?.find((r) => r.isPrimary) ?? activeChar.readings?.[0]) : undefined
        const explicit = toneTrainer.pinyin !== undefined
        return (
          <ToneTrainer
            key={explicit ? `x:${toneTrainer.hanzi}:${toneTrainer.pinyin}` : 'active'}
            hanzi={explicit ? (toneTrainer.hanzi ?? '') : (activeChar?.hanzi ?? '')}
            pinyin={explicit ? (toneTrainer.pinyin ?? '') : (primary?.pinyin ?? '')}
            hanViet={explicit ? toneTrainer.hanViet : primary?.hanViet}
            initialMode={toneTrainer.mode}
            onNextChar={explicit ? undefined : handleNext}
            onClose={() => setToneTrainer(null)}
          />
        )
      })()}
    </div>
  )
}
