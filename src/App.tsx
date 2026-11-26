import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { BundleCharacter, HskLevel, LevelFilter } from './core'
import { pickRandom, RADICAL_CHARACTERS } from './core'
import { api } from './api'
import { Navbar } from './components/Navbar'
import { LeftSidebar } from './components/LeftSidebar'
import { StudioCenter } from './components/StudioCenter'
import { RightBreakdown } from './components/RightBreakdown'
import { SearchModal } from './components/SearchModal'
import { FavoritesModal } from './components/FavoritesModal'
import { PronunciationModal } from './components/PronunciationModal'
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
  const [pronounceTarget, setPronounceTarget] = useState<{
    hanzi: string
    pinyin: string
    hanViet?: string | null
    meaningVi?: string | null
  } | null>(null)

  // Appearance: Chế độ hiển thị chữ ('modern' - Mặc định hoặc 'components' - Thành phần)
  const [displayMode, setDisplayMode] = useState<'modern' | 'components'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hibu_display_mode')
      if (saved === 'components' || saved === 'modern') return saved
    }
    return 'modern'
  })
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hibu_theme')
      if (saved) return saved === 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  // Favorites in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('hibu_hanzi_favs')
        return saved ? JSON.parse(saved) : []
      } catch {
        return []
      }
    }
    return []
  })

  // Apply dark mode class to root
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('hibu_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('hibu_theme', 'light')
    }
  }, [isDarkMode])

  // Save favorites
  useEffect(() => {
    try {
      localStorage.setItem('hibu_hanzi_favs', JSON.stringify(favorites))
    } catch {
      // ignore
    }
  }, [favorites])

  // Save selected HSK level
  useEffect(() => {
    try {
      localStorage.setItem('hibu_hsk_level', String(selectedLevel))
    } catch {
      // ignore
    }
  }, [selectedLevel])

  // Filter pool based on HSK 3.0 level (1-6) or Radicals
  const filteredCharacters = useMemo(() => {
    if (selectedLevel === 'radicals') {
      return RADICAL_CHARACTERS
    }
    return allCharacters.filter((c) => c.hsk3Level === selectedLevel)
  }, [allCharacters, selectedLevel])

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

  // Active character: check current level pool first, then global characters/radicals, then fallback to first item
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

      // Preserve requested hanzi even if not in bundle list (will load via detail API)
      return {
        hanzi: currentHanzi,
        traditional: null,
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

  // Level switching: updates URL and pushes history so Back returns to previous character & level
  const handleLevelChange = useCallback(
    (lvl: LevelFilter) => {
      if (lvl === selectedLevel) return
      const nextPool =
        lvl === 'radicals'
          ? RADICAL_CHARACTERS
          : allCharacters.filter((c) => c.hsk3Level === lvl)
      const nextHanzi = nextPool[0]?.hanzi ?? null
      if (nextHanzi) {
        navigateTo(nextHanzi, lvl, 'push')
      } else {
        setSelectedLevel(lvl)
        setCurrentHanzi(null)
      }
    },
    [selectedLevel, allCharacters, navigateTo],
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

  const handlePipCharacterChange = useCallback(
    (h: string) => {
      const resolved = resolveTarget(h)
      navigateTo(resolved.hanzi, resolved.level, 'replace')
    },
    [resolveTarget, navigateTo],
  )

  // Toggle favorite
  const handleToggleFavorite = useCallback(() => {
    if (!activeChar) return
    setFavorites((prev) =>
      prev.includes(activeChar.hanzi)
        ? prev.filter((h) => h !== activeChar.hanzi)
        : [...prev, activeChar.hanzi],
    )
  }, [activeChar])

  // Fetch character details for breakdown
  const detailQuery = useQuery({
    queryKey: ['character', activeChar?.hanzi],
    queryFn: () => (activeChar ? api.getCharacter(activeChar.hanzi) : null),
    enabled: Boolean(activeChar),
  })

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowSearch(true)
        return
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          handleNext()
          break
        case 'ArrowLeft':
          e.preventDefault()
          handlePrev()
          break
        case ' ':
          e.preventDefault()
          pickNextRandom()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          handleToggleFavorite()
          break
        case 'p':
        case 'P':
          e.preventDefault()
          setShowPinyinChart((prev) => !prev)
          break
        case 'Backspace':
          if (canGoBack) {
            e.preventDefault()
            handleGoBack()
          }
          break
        case 'Escape':
          setShowSearch(false)
          setShowFavorites(false)
          setShowPinyinChart(false)
          setPronounceTarget(null)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev, pickNextRandom, handleToggleFavorite, canGoBack, handleGoBack])

  const toggleDisplayMode = () => {
    setDisplayMode((prev) => {
      const next = prev === 'modern' ? 'components' : 'modern'
      try {
        localStorage.setItem('hibu_display_mode', next)
      } catch {
        // ignore
      }
      return next
    })
  }

  // Check if any modal or overlay is currently active
  const isModalActive = Boolean(
    showSearch ||
    showFavorites ||
    showPinyinChart ||
    pronounceTarget ||
    (typeof document !== 'undefined' && document.querySelector('.modal-backdrop'))
  )

  // Prevent background scrolling while any modal is open
  useEffect(() => {
    if (isModalActive) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isModalActive])

  // Mobile horizontal swipe gestures: restricted to the hero card so vertical scroll never misfires
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
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX
      touchStartYRef.current = e.touches[0].clientY
    }
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

    // Strict horizontal gesture threshold (> 75px and > 2.2x vertical travel)
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
        displayMode={displayMode}
        onToggleDisplayMode={toggleDisplayMode}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        favoritesCount={favorites.length}
        onOpenFavorites={() => setShowFavorites(true)}
        onOpenSearch={() => setShowSearch(true)}
        onOpenPinyinChart={() => setShowPinyinChart(true)}
      />

      {/* Main Study Studio Content */}
      <main className="studio-main-viewport">
        {bundle.isPending && (
          <div className="studio-state-center">
            <div className="spinner-ring" />
            <p>Đang chuẩn bị kho dữ liệu Hán tự & Chiết tự…</p>
          </div>
        )}

        {bundle.isError && (
          <div className="studio-state-center error">
            <p className="error-title">Chưa tải được dữ liệu</p>
            <p className="error-sub">Vui lòng kiểm tra lại kết nối và thử lại.</p>
            <button type="button" className="pill-btn active" onClick={() => bundle.refetch()}>
              Thử lại
            </button>
          </div>
        )}

        {bundle.isSuccess && (
          <>
            {bundle.data.offline && (
              <div className="offline-notice" role="status">
                Đang dùng dữ liệu mẫu (không kết nối được máy chủ).
                <button type="button" onClick={() => bundle.refetch()}>
                  Thử lại
                </button>
              </div>
            )}

            {/* Studio Workspace: Desktop 3-Column / Mobile Single Unified Scroll */}
            <div
              className="studio-split-layout"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Left Column: Character Library (Desktop Only) */}
              <LeftSidebar
                characters={allCharacters}
                activeHanzi={activeChar?.hanzi ?? null}
                onSelectHanzi={handleSelectHanzi}
                selectedLevel={selectedLevel}
                onLevelChange={handleLevelChange}
                favorites={favorites}
                onOpenGlobalSearch={() => setShowSearch(true)}
              />

              {/* Center Column: Slide 1 (Writing Canvas & Pronunciation) */}
              <div className="studio-col-center">
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
                  />
                ) : (
                  <div className="center-empty-workspace">
                    <div className="empty-calligraphy-seal" aria-hidden="true">無</div>
                    <div className="empty-workspace-content">
                      <h3 className="empty-workspace-title">Chưa có chữ Hán ở bộ lọc này</h3>
                      <p className="empty-workspace-desc">
                        {selectedLevel === 'radicals'
                          ? 'Chưa có bộ thủ nào trong kho dữ liệu hiện tại.'
                          : `Cấp độ HSK 3.0 Cấp ${selectedLevel} hiện chưa có từ trong gói dữ liệu hiện tại.`}
                      </p>
                      <button
                        type="button"
                        className="empty-reset-pill-btn"
                        onClick={() => handleLevelChange(1)}
                      >
                        Quay về Cấp 1
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Slide 2 (Deep Decomposition & Vocabulary) */}
              <div className="studio-col-right">
                <RightBreakdown
                  detail={detailQuery.data ?? null}
                  isLoading={detailQuery.isPending}
                  onSelectHanzi={handleSelectHanzi}
                  displayMode={displayMode}
                  characters={allCharacters}
                />
              </div>
            </div>

            {/* Mobile Horizontal Bottom Bar: Fixed Swipeable Character Strip */}
            <MobileBottomBar
              characters={filteredCharacters}
              activeHanzi={activeChar?.hanzi ?? null}
              onSelectHanzi={handleSelectHanzi}
              selectedLevel={selectedLevel}
              onLevelChange={handleLevelChange}
              favorites={favorites}
            />
          </>
        )}
      </main>

      {bundle.isSuccess && (
        <PipWidget
          characters={allCharacters}
          favorites={favorites}
          onCharacterChange={handlePipCharacterChange}
        />
      )}

      {/* Search Modal */}
      {showSearch && (
        <SearchModal
          characters={allCharacters}
          words={allWords}
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
          onRemoveFavorite={(h) => setFavorites((prev) => prev.filter((fav) => fav !== h))}
          onClearAll={() => setFavorites([])}
          onClose={() => setShowFavorites(false)}
        />
      )}

      {/* Comprehensive Pinyin Chart Modal */}
      {showPinyinChart && (
        <PinyinChartModal
          onClose={() => setShowPinyinChart(false)}
          onInspectPinyin={(pinyin) => {
            setPronounceTarget({
              hanzi: '拼',
              pinyin,
              hanViet: 'ÂM TIẾT PINYIN',
              meaningVi: `Tra cứu khẩu hình và cách phát âm cho âm tiết [ ${pinyin} ]`,
            })
          }}
        />
      )}

      {/* Pronunciation & Mouth Shape Modal for Individual Syllable */}
      {pronounceTarget && (
        <PronunciationModal
          hanzi={pronounceTarget.hanzi}
          pinyin={pronounceTarget.pinyin}
          hanViet={pronounceTarget.hanViet}
          meaningVi={pronounceTarget.meaningVi}
          onClose={() => setPronounceTarget(null)}
        />
      )}
    </div>
  )
}
