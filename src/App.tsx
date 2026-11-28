import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { BundleCharacter, HskLevel, LevelFilter } from './core'
import {
  charactersWithRadical,
  containedForms,
  findFamily,
  getLocalBundle,
  frequencyRank,
  pickRandom,
  RADICAL_CHARACTERS,
  radicalFamilies,
} from './core'
import { api } from './api'
import { Navbar } from './components/Navbar'
import { TodayView } from './today/TodayView'
import { StatsView } from './today/StatsView'
import { OnboardingModal } from './today/OnboardingModal'
import { getDaily, shouldOnboard } from './learn/daily'
import { getLearnData } from './learn/srs'
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
import { getFinalSampleSyllable, parsePinyin } from './utils/pinyinData'
import { PipWidget } from './components/PipWidget'
import { Rail } from './components/Rail'
import { ReviewSession } from './components/ReviewSession'
import { BackupModal } from './components/BackupModal'
import { BackupReminder } from './components/BackupReminder'
import { useAutoSync } from './learn/useAutoSync'
import { toggleKnown } from './learn/srs'
import { SETTINGS_RESTORED_EVENT } from './learn/backup'
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

const LAST_HANZI_KEY = 'hibu_last_hanzi'
function readLastHanzi(): Record<string, string> {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_HANZI_KEY) ?? '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

type AppView = 'studio' | 'today' | 'stats'

/** A shared / bookmarked link into a specific character, word or the review dialog. */
function hasDeepLink(): boolean {
  if (typeof window === 'undefined') return false
  const q = new URLSearchParams(window.location.search)
  return Boolean(parseRouteFromUrl().hanzi || q.get('mode') || q.get('w'))
}
function readViewParam(): AppView | null {
  if (typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get('view')
  return v === 'today' || v === 'stats' ? v : null
}
/** ?view= wins; a deep link means studio; otherwise returning learners land on "Học hôm nay". */
function landingView(): AppView {
  const v = readViewParam()
  if (v) return v
  if (hasDeepLink()) return 'studio'
  const d = getDaily()
  const l = getLearnData()
  const hasData = Object.keys(l.cards).length > 0 || Object.keys(l.known).length > 0
  return d.track !== 'lookup' && (d.onboarded !== null || hasData) ? 'today' : 'studio'
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

  // Each HSK level is studied most-frequent-first (的 了 我 是 你 …), not in database id order. Every
  // consumer (list, Trước/Tiếp, quiz, widget) filters this array, so they all share that order.
  const allCharacters = useMemo(
    () => [...(bundle.data?.characters ?? [])].sort((a, b) => frequencyRank(a.hanzi) - frequencyRank(b.hanzi)),
    [bundle.data?.characters],
  )
  // While the server copy loads, the built-in sample (38 characters) is only a placeholder: showing it
  // made the counter jump from "1/38" to "78/300". Keep the skeleton for up to 5 s; if the download is
  // slow, fall back to the sample with a notice instead of an endless skeleton.
  const [placeholderSlow, setPlaceholderSlow] = useState(false)
  useEffect(() => {
    if (!bundle.isPlaceholderData) return
    const t = window.setTimeout(() => setPlaceholderSlow(true), 5000)
    return () => window.clearTimeout(t)
  }, [bundle.isPlaceholderData])
  const waitingForData = bundle.isLoading || (bundle.isPlaceholderData && !placeholderSlow)
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

  // "Học hôm nay" / "Thống kê" take the place of the study sheet inside <main>; mirrored in ?view=.
  const [view, setViewState] = useState<AppView>(landingView)
  const setView = useCallback((v: AppView) => setViewState(v), [])
  useEffect(() => {
    const url = new URL(window.location.href)
    if (view === 'studio') url.searchParams.delete('view')
    else url.searchParams.set('view', view)
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url)
  }, [view])
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !hasDeepLink() && shouldOnboard())
  const [learnOpen, setLearnOpen] = useState(false)

  // Filters & State (HSK 1-6 hoặc Tab 'radicals' Bộ thủ)
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>(
    () => initialRouteRef.current.level ?? getSavedLevelFallback(),
  )
  const [activeWord, setActiveWord] = useState<string | null>(() => initialRouteRef.current.word)
  // Only a single Han code point may become the active character before the real bundle loads;
  // otherwise ?c=constructor / ?c=abc could be marked known or saved during the loading window.
  const [currentHanzi, setCurrentHanzi] = useState<string | null>(() => {
    const h = initialRouteRef.current.hanzi
    return h && /^\p{Script=Han}$/u.test(h) ? h : null
  })

  // Inside the radicals tab: the radical family whose characters are listed (null = list radicals).
  const [radicalKey, setRadicalKeyState] = useState<string | null>(null)
  // Mirrored in a ref so navigateTo can record it in history.state (Back/Forward restore the family).
  const radicalKeyRef = useRef<string | null>(null)
  const setRadicalKey = useCallback((k: string | null) => {
    radicalKeyRef.current = k
    setRadicalKeyState(k)
  }, [])
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
  const showReviewRef = useRef(showReview)
  showReviewRef.current = showReview
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

  // A backup restored with "Ghi đè" rewrites these keys in storage: apply them without a reload.
  useEffect(() => {
    const onRestored = () => {
      try {
        const theme = localStorage.getItem('hibu_theme')
        if (theme === 'dark' || theme === 'light') setIsDarkMode(theme === 'dark')
        const mode = localStorage.getItem('hibu_display_mode')
        if (mode === 'modern' || mode === 'components') setDisplayMode(mode)
        setRailCollapsed(localStorage.getItem('hibu_rail_collapsed') === '1')
      } catch {
        // ignore
      }
    }
    window.addEventListener(SETTINGS_RESTORED_EVENT, onRestored)
    return () => window.removeEventListener(SETTINGS_RESTORED_EVENT, onRestored)
  }, [])

  // Only an explicit toggle is persisted
  const toggleDarkMode = () =>
    setIsDarkMode((prev) => {
      try {
        localStorage.setItem('hibu_theme', prev ? 'light' : 'dark')
      } catch {
        // ignore
      }
      return !prev
    })

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    // Stored value may be hand-edited or from an older build: keep only unique strings, so a
    // non-array (null, {}, "好") can never crash render (.includes/.filter) on every reload.
    try {
      const v: unknown = JSON.parse(localStorage.getItem('hibu_favorites') ?? '[]')
      return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x !== ''))] : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('hibu_favorites', JSON.stringify(favorites))
    } catch {
      // storage full / blocked: keep the in-memory list
    }
  }, [favorites])

  // Cross-device sync (no-op until the user turns it on in the backup dialog).
  useAutoSync(favorites, setFavorites)

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

      // Unknown but plausible character (one Han code point, e.g. from a word): show it as a stub.
      // Anything else (?c=abc, ?c=好好, ?c=constructor, emoji) falls back to the level's first
      // character so garbage never reaches the URL, favorites or the SRS deck.
      if (/^\p{Script=Han}$/u.test(h)) return { hanzi: h, level: selectedLevel }
      return { hanzi: filteredCharacters[0]?.hanzi ?? h, level: selectedLevel }
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
      if (historyMode === 'push') setViewState('studio') // picking a character leaves Today / Stats
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
        window.history.replaceState({ idx, hanzi, level, word, rk: radicalKeyRef.current }, '', nextUrl)
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
      window.history.pushState({ idx: nextIdx, hanzi, level, word, rk: radicalKeyRef.current }, '', nextUrl)
    },
    [currentHanzi, selectedLevel, activeWord],
  )

  const changeLevel = useCallback((lvl: LevelFilter) => {
    setSelectedLevel(lvl)
    setRadicalKey(null)
    const nextPool =
      lvl === 'radicals' ? radicalPool : allCharacters.filter((c) => c.hsk3Level === lvl)
    // Switching back to a level resumes where the learner left it.
    const last = lvl === 'radicals' ? undefined : readLastHanzi()[String(lvl)]
    const start = (last && nextPool.find((c) => c.hanzi === last)) || nextPool[0]
    if (start) {
      navigateTo(start.hanzi, lvl, 'push')
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
      setViewState('studio')
      setCurrentHanzi(null)
    },
    [families, allCharacters, contained, navigateTo],
  )

  // Initialize canonical URL & first history entry once bundle finishes loading
  useEffect(() => {
    // Wait for the real bundle: the placeholder sample would pick its own first character.
    if (!bundle.isSuccess || bundle.isPlaceholderData || hasInitializedUrlRef.current) return
    const route = initialRouteRef.current

    if (route.hanzi) {
      const resolved = resolveTarget(route.hanzi, route.level ?? undefined)
      hasInitializedUrlRef.current = true
      navigateTo(resolved.hanzi, resolved.level, 'replace', route.word)
    } else if (currentHanzi) {
      // The learner already moved while the sample was showing: keep their character.
      hasInitializedUrlRef.current = true
    } else if (filteredCharacters[0]) {
      hasInitializedUrlRef.current = true
      // Reopening the app resumes the character last studied at this level.
      const last = readLastHanzi()[String(selectedLevel)]
      const start = (last && filteredCharacters.find((c) => c.hanzi === last)) || filteredCharacters[0]
      navigateTo(start.hanzi, selectedLevel, 'replace')
    }
  }, [bundle.isSuccess, bundle.isPlaceholderData, currentHanzi, filteredCharacters, selectedLevel, resolveTarget, navigateTo])

  // Remember the level and, per level, the character being studied (read back on the next visit).
  useEffect(() => {
    if (!hasInitializedUrlRef.current || !currentHanzi) return
    try {
      localStorage.setItem('hibu_hsk_level', String(selectedLevel))
      if (selectedLevel === 'radicals') return
      const map = readLastHanzi()
      map[String(selectedLevel)] = currentHanzi
      localStorage.setItem(LAST_HANZI_KEY, JSON.stringify(map))
    } catch {
      // storage unavailable: nothing to remember
    }
  }, [selectedLevel, currentHanzi])

  // Handle Browser Back / Forward (popstate)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      setViewState(readViewParam() ?? 'studio')
      // ?mode=review mirrors whether the review dialog is open, not what the history entry had
      // when it was pushed: re-sync it so a reload after Back/Forward resumes the right thing.
      {
        const url = new URL(window.location.href)
        const want = showReviewRef.current
        if (want !== (url.searchParams.get('mode') === 'review')) {
          if (want) url.searchParams.set('mode', 'review')
          else url.searchParams.delete('mode')
          window.history.replaceState(window.history.state, '', url)
        }
      }
      const state = e.state as { idx?: number; hanzi?: string; level?: LevelFilter; rk?: string | null } | null
      const parsed = parseRouteFromUrl()
      const targetHanzi = state?.hanzi ?? parsed.hanzi
      const targetLevel = state?.level ?? parsed.level

      if (targetHanzi) {
        // An entry recorded inside a radical family keeps that family (its characters are usually
        // HSK characters, which resolveTarget alone would move back to their HSK level).
        const inFamily = targetLevel === 'radicals' && state?.rk && families.some((f) => f.key === state.rk)
        const resolved = inFamily ? { hanzi: targetHanzi, level: 'radicals' as const } : resolveTarget(targetHanzi, targetLevel ?? undefined)
        setRadicalKey(inFamily ? state!.rk! : null)
        // The entry may predate the full bundle (sample data) or point at a garbage hanzi: keep the
        // URL in step with what is actually shown.
        if (resolved.hanzi !== targetHanzi || resolved.level !== targetLevel) {
          window.history.replaceState({ ...(state ?? {}), hanzi: resolved.hanzi, level: resolved.level }, '', buildCharacterUrl(resolved.hanzi, resolved.level, parsed.word))
        }
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
        setRadicalKey(null)
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
  }, [allCharacters, resolveTarget, radicalPool, families, setRadicalKey])

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

  // Navigation pool: the sidebar's narrowed grid (Sổ tay / Đã thuộc / text filter / sort) when it
  // reports one, else the level. The active character may have left the narrowed list (e.g. just
  // marked known under "Chưa thuộc"): then next/prev continue from where it used to be.
  const [sidebarList, setSidebarList] = useState<BundleCharacter[] | null>(null)
  const usingSidebarList = sidebarList !== null && sidebarList.length > 0
  const navPool = usingSidebarList ? sidebarList : filteredCharacters
  const navIndex = usingSidebarList
    ? (activeChar ? sidebarList.findIndex((c) => c.hanzi === activeChar.hanzi) : -1)
    : currentIndex
  const lastNavIndexRef = useRef(0)
  useEffect(() => {
    if (navIndex >= 0) lastNavIndexRef.current = navIndex
  }, [navIndex])

  // Pick random other character
  const pickNextRandom = useCallback(() => {
    if (navPool.length <= 1 && navIndex >= 0) return
    const others = navPool.filter((c) => c.hanzi !== activeChar?.hanzi)
    const picked = pickRandom(others.length > 0 ? others : navPool)
    if (picked) {
      navigateTo(picked.hanzi, selectedLevel, 'push')
    }
  }, [navPool, navIndex, activeChar, selectedLevel, navigateTo])

  // Next / Prev sequentially
  const handleNext = useCallback(() => {
    const n = navPool.length
    if (n === 0) return
    const nextIdx = navIndex >= 0 ? (navIndex + 1) % n : Math.min(lastNavIndexRef.current, n - 1)
    navigateTo(navPool[nextIdx].hanzi, selectedLevel, 'push')
  }, [navPool, navIndex, selectedLevel, navigateTo])

  const handlePrev = useCallback(() => {
    const n = navPool.length
    if (n === 0) return
    const prevIdx = navIndex >= 0 ? (navIndex - 1 + n) % n : (Math.min(lastNavIndexRef.current, n) - 1 + n) % n
    navigateTo(navPool[prevIdx].hanzi, selectedLevel, 'push')
  }, [navPool, navIndex, selectedLevel, navigateTo])

  // Up / down move one row in the left grid; the sidebar reports how many columns it shows.
  const [gridCols, setGridCols] = useState(5)
  const [gridPerPage, setGridPerPage] = useState(30)
  const handleGridChange = useCallback((cols: number, perPage: number) => {
    setGridCols(cols)
    setGridPerPage(perPage)
  }, [])
  const handleRow = useCallback(
    (dir: 1 | -1) => {
      if (navIndex < 0) return
      const idx = navIndex + dir * gridCols
      if (idx < 0 || idx >= navPool.length) return
      navigateTo(navPool[idx].hanzi, selectedLevel, 'push')
    },
    [navPool, navIndex, gridCols, selectedLevel, navigateTo],
  )

  const handlePage = useCallback(
    (dir: 1 | -1) => {
      const page = Math.floor(Math.max(0, navIndex) / gridPerPage) + dir
      const idx = page * gridPerPage
      if (page < 0 || idx >= navPool.length) return
      navigateTo(navPool[idx].hanzi, selectedLevel, 'push')
    },
    [navPool, navIndex, gridPerPage, selectedLevel, navigateTo],
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
    // Compare toneless but keep ü distinct from u (lǜ ≠ lù, nǚ ≠ nǔ). A bare final from the Finals
    // tab (i, ü, ün, üan…) is looked up through its standalone spelling (yi, yu, yun, yuan); the
    // suffix fallback only accepts a real initial in front (ang -> bāng, never chuáng = ch+uang).
    const fold = (p: string) => parsePinyin(p).normalized
    const want = fold(pronounceTarget)
    const standalone = fold(getFinalSampleSyllable(want))
    let best: { rank: number; hanzi: string; r: BundleCharacter['readings'][number] } | null = null
    for (const c of allCharacters) {
      for (const r of c.readings) {
        const py = fold(r.pinyin)
        const viaInitial = py.endsWith(want) && parsePinyin(py).initial === py.slice(0, py.length - want.length)
        const rank = (py === want ? 0 : py === standalone ? 5 : viaInitial ? 10 : 99) + (c.hsk3Level ?? 7)
        if (rank < 99 && (!best || rank < best.rank)) best = { rank, hanzi: c.hanzi, r }
      }
    }
    if (best) return { hanzi: best.hanzi, pinyin: best.r.pinyin, hanViet: best.r.hanViet, meaningVi: best.r.meaningVi }
    return { hanzi: '', pinyin: pronounceTarget, hanViet: null, meaningVi: null }
  }, [pronounceTarget, allCharacters])

  const [quizScope, setQuizScope] = useState<QuizScope | null>(null)
  const modalOpen = quizScope !== null || showSearch || showFavorites || showPinyinChart || pronounceTarget !== null || showReview || showBackup || toneTrainer !== null || showOnboarding || learnOpen

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd+K opens search from anywhere, including the sidebar filter input.
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (!modalOpen) setShowSearch(true)
        return
      }

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return
      }

      // Esc is owned by useModalDialog (top-most dialog only, once): the search / chart / pronunciation /
      // favorites / list drawer all register there, so closing them here too would double-handle it.
      if (e.key === 'Escape') return

      // The drawer / bottom sheet covers the studio: only its own toggle (l) may act behind the scrim.
      if (overlayList && listOpen && e.key.toLowerCase() !== 'l') return

      if (e.key === 'Backspace' && canGoBack && !modalOpen && view === 'studio') {
        e.preventDefault()
        handleGoBack()
        return
      }

      if (modalOpen || e.altKey) return

      // While the skeleton covers the studio, shortcuts must not act on the hidden sample character.
      if (waitingForData) return

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

      actions.t = () => setView('today')
      // Today / Stats cover the studio: only the global shortcuts act, never the hidden character.
      if (view !== 'studio' && !['f', 'r', 'p', 'v', 't'].includes(key)) return

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
    waitingForData,
    overlayList,
    listOpen,
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
    view,
    setView,
  ])

  // A new character starts at the top of the page.
  const activeHanzi = activeChar?.hanzi
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [activeHanzi])
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [view])

  // Check if any modal or overlay is currently active
  const isModalActive = Boolean(
    modalOpen || (overlayList && listOpen),
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
  const loaded = !waitingForData && !bundle.isError

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
        characters={allCharacters}
        todayActive={view === 'today'}
        onOpenToday={() => setView('today')}
        onOpenStats={() => setView('stats')}
        onOpenOnboarding={() => setShowOnboarding(true)}
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
              onListChange={setSidebarList}
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
            {bundle.isPlaceholderData && !waitingForData && (
              <div className="sample-notice" role="status">
                <span>Đang tải đầy đủ dữ liệu, tạm hiện bộ chữ mẫu…</span>
              </div>
            )}
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
            {waitingForData ? (
              <SheetSkeleton />
            ) : bundle.isError ? (
              <ErrorState message={String(bundle.error)} onRetry={() => bundle.refetch()} />
            ) : view === 'today' ? (
              <TodayView
                characters={allCharacters}
                onStartReview={() => setShowReview(true)}
                onOpenStats={() => setView('stats')}
                onOpenStudio={() => setView('studio')}
                onOpenCharacter={handleSelectHanzi}
                onLearnOpenChange={setLearnOpen}
              />
            ) : view === 'stats' ? (
              <StatsView characters={allCharacters} onOpenCharacter={handleSelectHanzi} onBack={() => setView('today')} />
            ) : activeChar ? (
              <div className="sheet">
                <StudioCenter
                  character={activeChar}
                  detail={detailQuery.data ?? null}
                  currentIndex={usingSidebarList && navIndex >= 0 ? navIndex : currentIndex}
                  totalCount={usingSidebarList && navIndex >= 0 ? navPool.length : filteredCharacters.length}
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
                  allWords={allWords}
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

          {view === 'studio' && <StudyNav
            onPrev={handlePrev}
            onNext={handleNext}
            onRandom={pickNextRandom}
            onOpenList={openList}
            listOpen={overlayList ? listOpen : !railCollapsed}
            index={usingSidebarList && navIndex >= 0 ? navIndex : currentIndex}
            total={loaded && activeChar ? (usingSidebarList && navIndex >= 0 ? navPool.length : filteredCharacters.length) : 0}
            disabled={!loaded || filteredCharacters.length === 0}
          />}
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
          words={allWords}
          onOpenWord={(w) => {
            setShowReview(false)
            handleSelectWord(w)
          }}
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
      <BackupReminder hidden={modalOpen} onOpenBackup={() => setShowBackup(true)} />

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
            // Stacked on top of the chart (not replacing it): Esc returns to the chart, focus on the cell.
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

      {showOnboarding && (
        <OnboardingModal
          onDone={(startLearning) => {
            setShowOnboarding(false)
            if (startLearning) setView('today')
          }}
          onClose={() => setShowOnboarding(false)}
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
