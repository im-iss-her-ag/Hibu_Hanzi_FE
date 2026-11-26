import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { BundleCharacter, HskLevel, LevelFilter } from './core'
import {
  charactersWithRadical,
  containedForms,
  findFamily,
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
import { FavoritesModal } from './components/FavoritesModal'
import { PinyinChartModal } from './components/PinyinChartModal'
import { PipWidget } from './components/PipWidget'
import { MobileBottomBar } from './components/MobileBottomBar'
import { buildCharacterUrl, getSavedLevelFallback, parseRouteFromUrl } from './utils/routing'

export interface HistoryEntry {
  hanzi: string
  level: LevelFilter
}

export function App() {
  // Query full bundle (server or local offline dataset)
  const bundle = useQuery({
    queryKey: ['bundle'],
    queryFn: () => api.getBundle(),
  })

  const allCharacters = useMemo(() => bundle.data?.characters ?? [], [bundle.data?.characters])
  const allWords = useMemo(() => bundle.data?.words ?? [], [bundle.data?.words])
  const contained = useMemo(() => containedForms(allCharacters), [allCharacters])
  const families = useMemo(
    () => radicalFamilies(allCharacters, bundle.data?.components ?? [], contained),
    [allCharacters, bundle.data?.components, contained],
  )

  // Initial route parsed once from URL (?c=...&level=...)
  const initialRouteRef = useRef(parseRouteFromUrl())
  const hasInitializedUrlRef = useRef(false)

  // Filters & State (HSK 1-6 hoặc Tab 'radicals' Bộ thủ)
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>(
    () => initialRouteRef.current.level ?? getSavedLevelFallback(),
  )
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
  const [pronounceTarget, setPronounceTarget] = useState<string | null>(null)

  // Mobile drawer state
  const [mobileListOpen, setMobileListOpen] = useState(false)

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
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('hibu_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('hibu_theme', 'light')
    }
  }, [isDarkMode])

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev)

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
      return activeFamily ? charactersWithRadical(allCharacters, activeFamily, contained) : RADICAL_CHARACTERS
    }
    return allCharacters.filter((c) => c.hsk3Level === selectedLevel)
  }, [allCharacters, selectedLevel, activeFamily, contained])

  // Resolve target level & canonical character for any hanzi
  const resolveTarget = useCallback(
    (h: string, preferredLevel?: LevelFilter): { hanzi: string; level: LevelFilter } => {
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
    [allCharacters, filteredCharacters, selectedLevel],
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
    const idx = filteredCharacters.findIndex((c) => c.hanzi === activeChar.hanzi)
    return idx >= 0 ? idx : 0
  }, [filteredCharacters, activeChar])

  // Core navigation helper: keeps React state, URL query, and browser History in sync
  const navigateTo = useCallback(
    (hanzi: string, level: LevelFilter, historyMode: 'push' | 'replace' = 'push') => {
      const currentUrlEntry = parseRouteFromUrl()
      const isSameAsState = currentHanzi === hanzi && selectedLevel === level
      const isSameAsUrl = currentUrlEntry.hanzi === hanzi && currentUrlEntry.level === level

      setSelectedLevel(level)
      setCurrentHanzi(hanzi)
      if (level !== 'radicals') {
        setRadicalKey(null)
      }

      if (typeof window === 'undefined') return
      const nextUrl = buildCharacterUrl(hanzi, level)

      if (historyMode === 'replace') {
        const baseStack =
          historyStackRef.current.length > 0
            ? [...historyStackRef.current]
            : [{ hanzi, level }]
        const idx = Math.max(0, historyIndexRef.current)
        baseStack[idx] = { hanzi, level }
        setHistoryStack(baseStack)
        setHistoryIndex(idx)
        window.history.replaceState({ idx, hanzi, level }, '', nextUrl)
        return
      }

      if (isSameAsState && isSameAsUrl) return

      const base = historyStackRef.current.slice(0, historyIndexRef.current + 1)
      const last = base[base.length - 1]
      if (last && last.hanzi === hanzi && last.level === level) return

      const nextStack = [...base, { hanzi, level }].slice(-30)
      const nextIdx = nextStack.length - 1
      setHistoryStack(nextStack)
      setHistoryIndex(nextIdx)
      window.history.pushState({ idx: nextIdx, hanzi, level }, '', nextUrl)
    },
    [currentHanzi, selectedLevel],
  )

  const changeLevel = useCallback((lvl: LevelFilter) => {
    setSelectedLevel(lvl)
    setRadicalKey(null)
    const nextPool =
      lvl === 'radicals'
        ? RADICAL_CHARACTERS
        : allCharacters.filter((c) => c.hsk3Level === lvl)
    if (nextPool[0]) {
      navigateTo(nextPool[0].hanzi, lvl, 'push')
    }
  }, [allCharacters, navigateTo])

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
      navigateTo(resolved.hanzi, resolved.level, 'replace')
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
        setSelectedLevel(targetLevel)
        const pool =
          targetLevel === 'radicals'
            ? RADICAL_CHARACTERS
            : allCharacters.filter((c) => c.hsk3Level === targetLevel)
        if (pool[0]) setCurrentHanzi(pool[0].hanzi)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [allCharacters, resolveTarget])

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

  // In-app Back action (keeps browser Back/Forward synchronized)
  const canGoBack = historyIndex > 0
  const previousEntry = canGoBack ? historyStack[historyIndex - 1] : null
  const recentTrail = useMemo(() => {
    if (historyIndex <= 0) return []
    return historyStack.slice(Math.max(0, historyIndex - 3), historyIndex + 1)
  }, [historyStack, historyIndex])

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

  const modalOpen = showSearch || showFavorites || showPinyinChart || pronounceTarget !== null

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
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowSearch(true)
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
        Tab: toggleDisplayMode,
        f: () => setShowSearch(true),
        g: handleToggleFavorite,
        b: () => changeLevel('radicals'),
        p: () => setShowPinyinChart((prev) => !prev),
      }
      for (const n of [1, 2, 3, 4, 5, 6] as const) actions[String(n)] = () => changeLevel(n)

      const action = actions[key]
      if (!action || (key === 'Tab' && e.shiftKey)) return
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
  ])

  // Check if any modal or overlay is currently active
  const isModalActive = Boolean(
    showSearch || showFavorites || showPinyinChart || pronounceTarget !== null || mobileListOpen,
  )

  // Mobile horizontal swipe gestures: restricted to the hero card
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null
    if (
      isModalActive ||
      !target?.closest('.mobile-hero-card') ||
      target?.closest('.mobile-mige-frame') ||
      target?.closest('.mobile-poly-card')
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

  return (
    <div className="studio-app-root">
      {/* Top Header / Navigation */}
      <Navbar
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        displayMode={displayMode}
        onToggleDisplayMode={toggleDisplayMode}
        favoritesCount={favorites.length}
        onOpenFavorites={() => setShowFavorites(true)}
        onOpenSearch={() => setShowSearch(true)}
        onOpenPinyinChart={() => setShowPinyinChart(true)}
        widget={
          bundle.isSuccess && (
            <PipWidget characters={allCharacters} favorites={favorites} onCharacterChange={handleSelectHanzi} />
          )
        }
      />

      {/* Main Study Studio Content */}
      <main className="studio-main-container">
        {bundle.isLoading ? (
          <div className="studio-loading-state">
            <div className="spinner-ring" />
            <p className="loading-text">Khởi tạo dữ liệu Hán tự Hibu…</p>
          </div>
        ) : bundle.isError ? (
          <div className="studio-error-state">
            <div className="error-icon-box">!</div>
            <h3>Không thể tải kho dữ liệu</h3>
            <p>{String(bundle.error)}</p>
            <button
              type="button"
              className="retry-fetch-btn"
              onClick={() => bundle.refetch()}
            >
              Thử kết nối lại
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Drawer Backdrop */}
            {mobileListOpen && (
              <div
                className="mobile-backdrop-overlay"
                onClick={() => setMobileListOpen(false)}
                aria-hidden="true"
              />
            )}

            {/* Studio Workspace: Desktop 3-Column / Mobile Single Unified Scroll */}
            <div
              className="studio-split-layout"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Left Column: Character List / Directory */}
              <LeftSidebar
                characters={allCharacters}
                activeHanzi={activeChar?.hanzi ?? null}
                onSelectHanzi={handleSelectHanzi}
                selectedLevel={selectedLevel}
                onLevelChange={changeLevel}
                favorites={favorites}
                families={families}
                activeFamily={activeFamily}
                radicalCharacters={activeFamily ? filteredCharacters : null}
                onBrowseRadical={browseRadical}
                onGridChange={handleGridChange}
                isOpenMobile={mobileListOpen}
                onCloseMobile={() => setMobileListOpen(false)}
              />

              {/* Center Column: Slide 1 (Writing Canvas & Pronunciation) */}
              <div className="studio-column-center">
                {activeChar ? (
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
                    onOpenMobileList={() => setMobileListOpen(true)}
                  />
                ) : (
                  <div className="center-empty-workspace">
                    <p>
                      {selectedLevel === 'radicals' && !activeFamily
                        ? 'Bấm một bộ thủ bên trái để xem các chữ chứa bộ đó.'
                        : 'Không có chữ Hán nào phù hợp trong danh mục này.'}
                    </p>
                    <button
                      type="button"
                      className="empty-reset-pill-btn"
                      onClick={() => changeLevel(1)}
                    >
                      Quay về Cấp 1
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Slide 2 (Etymology Decomposition & Compound Words) */}
              <div className="studio-column-right">
                <RightBreakdown
                  detail={detailQuery.data ?? null}
                  isLoading={detailQuery.isLoading}
                  onSelectHanzi={handleSelectHanzi}
                  displayMode={displayMode}
                  characters={allCharacters}
                  families={families}
                  onBrowseRadical={browseRadical}
                />
              </div>
            </div>

            {/* Mobile Bottom Bar for Level switching & mobile character directory access */}
            <MobileBottomBar
              characters={allCharacters}
              activeHanzi={activeChar?.hanzi ?? null}
              onSelectHanzi={handleSelectHanzi}
              selectedLevel={selectedLevel}
              onLevelChange={changeLevel}
              favorites={favorites}
            />
          </>
        )}
      </main>

      {/* Search Modal */}
      {showSearch && (
        <SearchModal
          characters={allCharacters}
          words={allWords}
          families={families}
          onBrowseRadical={(form) => {
            browseRadical(form)
            setShowSearch(false)
          }}
          onSelectHanzi={(h) => {
            handleSelectHanzi(h)
            setShowSearch(false)
          }}
          onClose={() => setShowSearch(false)}
        />
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
            setPronounceTarget(pinyin)
            setShowPinyinChart(false)
            setShowSearch(true)
          }}
          onClose={() => {
            setShowPinyinChart(false)
            setPronounceTarget(null)
          }}
        />
      )}
    </div>
  )
}
