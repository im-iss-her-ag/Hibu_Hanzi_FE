import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { HskLevel, LevelFilter } from './core'
import { charactersWithRadical, containedForms, findFamily, pickRandom, RADICAL_CHARACTERS, radicalFamilies } from './core'
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

  // Filters & State (HSK 1-6 hoặc Tab 'radicals' Bộ thủ)
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hibu_hsk_level')
      if (saved === 'radicals') return 'radicals'
      if (saved !== null) {
        const parsed = parseInt(saved, 10)
        if (parsed >= 1 && parsed <= 6) return parsed as HskLevel
      }
    }
    return 1 // Mặc định luôn là Cấp 1
  })
  const [currentHanzi, setCurrentHanzi] = useState<string | null>(null)
  // Inside the radicals tab: the radical family whose characters are listed (null = list radicals).
  const [radicalKey, setRadicalKey] = useState<string | null>(null)
  const activeFamily = useMemo(() => families.find((f) => f.key === radicalKey) ?? null, [families, radicalKey])

  const changeLevel = useCallback((lvl: LevelFilter) => {
    setSelectedLevel(lvl)
    setRadicalKey(null)
  }, [])

  const browseRadical = useCallback(
    (form: string | null) => {
      const family = form ? findFamily(families, form) : null
      setSelectedLevel('radicals')
      setRadicalKey(family?.key ?? null)
      setCurrentHanzi(null)
    },
    [families],
  )


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
      return activeFamily ? charactersWithRadical(allCharacters, activeFamily, contained) : RADICAL_CHARACTERS
    }
    return allCharacters.filter((c) => c.hsk3Level === selectedLevel)
  }, [allCharacters, selectedLevel, activeFamily, contained])

  // Active character
  const activeChar = useMemo(() => {
    if (filteredCharacters.length === 0) return null
    if (currentHanzi) {
      const found = filteredCharacters.find((c) => c.hanzi === currentHanzi)
      if (found) return found
    }
    return filteredCharacters[0]
  }, [filteredCharacters, currentHanzi])

  const currentIndex = useMemo(() => {
    if (!activeChar) return 0
    const idx = filteredCharacters.findIndex((c) => c.hanzi === activeChar.hanzi)
    return idx >= 0 ? idx : 0
  }, [filteredCharacters, activeChar])

  // Smart character navigation: automatically switch level if the character or radical belongs to another level
  const handleSelectHanzi = useCallback(
    (h: string) => {
      // 1. Check if it's already in the current filtered list
      const inCurrent = filteredCharacters.find((c) => c.hanzi === h || c.traditional === h)
      if (inCurrent) {
        setCurrentHanzi(inCurrent.hanzi)
        return
      }

      // 2. Check if it's in allCharacters (HSK 1-6)
      const foundInHsk = allCharacters.find((c) => c.hanzi === h || c.traditional === h)
      if (foundInHsk) {
        if (foundInHsk.hsk3Level && foundInHsk.hsk3Level >= 1 && foundInHsk.hsk3Level <= 6) {
          setSelectedLevel(foundInHsk.hsk3Level as HskLevel)
          setRadicalKey(null)
        }
        setCurrentHanzi(foundInHsk.hanzi)
        return
      }

      // 3. Check if it's a radical / component
      const foundInRadicals = RADICAL_CHARACTERS.find((r) => r.hanzi === h)
      if (foundInRadicals) {
        setSelectedLevel('radicals')
        setRadicalKey(null)
        setCurrentHanzi(foundInRadicals.hanzi)
        return
      }

      // 4. Fallback
      setCurrentHanzi(h)
    },
    [filteredCharacters, allCharacters],
  )

  // Pick random other character
  const pickNextRandom = useCallback(() => {
    if (filteredCharacters.length <= 1) return
    const others = filteredCharacters.filter((c) => c.hanzi !== activeChar?.hanzi)
    const picked = pickRandom(others.length > 0 ? others : filteredCharacters)
    if (picked) {
      setCurrentHanzi(picked.hanzi)
    }
  }, [filteredCharacters, activeChar])

  // Next / Prev sequentially
  const handleNext = useCallback(() => {
    if (filteredCharacters.length === 0) return
    const nextIdx = (currentIndex + 1) % filteredCharacters.length
    setCurrentHanzi(filteredCharacters[nextIdx].hanzi)
  }, [filteredCharacters, currentIndex])

  const handlePrev = useCallback(() => {
    if (filteredCharacters.length === 0) return
    const prevIdx = (currentIndex - 1 + filteredCharacters.length) % filteredCharacters.length
    setCurrentHanzi(filteredCharacters[prevIdx].hanzi)
  }, [filteredCharacters, currentIndex])




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
  }, [handleNext, handlePrev, pickNextRandom, handleToggleFavorite])

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

  // Mobile horizontal swipe gestures: Swipe left -> Next character, Swipe right -> Prev character
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    // If any modal/dialog is open or touch is inside a modal or canvas, do NOT trigger swipe
    if (
      isModalActive ||
      Boolean(document.querySelector('.modal-backdrop')) ||
      (e.target as HTMLElement)?.closest('.modal-backdrop') ||
      (e.target as HTMLElement)?.closest('.modal-content') ||
      (e.target as HTMLElement)?.closest('.hanzi-writer-modal') ||
      (e.target as HTMLElement)?.closest('.mige-canvas-frame') ||
      (e.target as HTMLElement)?.closest('.mobile-tile-track')
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
    if (
      isModalActive ||
      Boolean(document.querySelector('.modal-backdrop')) ||
      (e.target as HTMLElement)?.closest('.modal-backdrop') ||
      (e.target as HTMLElement)?.closest('.modal-content') ||
      (e.target as HTMLElement)?.closest('.hanzi-writer-modal')
    ) {
      touchStartXRef.current = null
      touchStartYRef.current = null
      return
    }
    if (touchStartXRef.current === null || touchStartYRef.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchEndX - touchStartXRef.current
    const deltaY = touchEndY - touchStartYRef.current

    // Trigger swipe if horizontal displacement > 50px and predominantly horizontal
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX < 0) {
        // Swiped left -> Chữ tiếp theo
        handleNext()
      } else {
        // Swiped right -> Chữ trước đó
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

            {/* Studio Workspace: Desktop 3-Column / Mobile Single Unified Scroll with Left-Right Swipe */}
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
                onLevelChange={changeLevel}
                favorites={favorites}
                families={families}
                activeFamily={activeFamily}
                radicalCharacters={activeFamily ? filteredCharacters : null}
                onBrowseRadical={browseRadical}
              />

              {/* Center Column: Slide 1 (Writing Canvas & Pronunciation) */}
              <div className="studio-col-center">
                {activeChar ? (
                  <StudioCenter
                    character={activeChar}
                    detail={detailQuery.data ?? null}
                    currentIndex={currentIndex}
                    totalCount={filteredCharacters.length}
                    isFavorite={favorites.includes(activeChar.hanzi)}
                    displayMode={displayMode}
                    onToggleFavorite={handleToggleFavorite}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    onRandom={pickNextRandom}
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
                        onClick={() => setSelectedLevel(1)}
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
                  families={families}
                  onBrowseRadical={browseRadical}
                />
              </div>
            </div>

            {/* Mobile Horizontal Bottom Bar: Fixed Swipeable Character Strip */}
            <MobileBottomBar
              characters={filteredCharacters}
              activeHanzi={activeChar?.hanzi ?? null}
              onSelectHanzi={handleSelectHanzi}
              selectedLevel={selectedLevel}
              onLevelChange={changeLevel}
              favorites={favorites}
            />
          </>
        )}
      </main>

      {bundle.isSuccess && (
        <PipWidget
          characters={allCharacters}
          favorites={favorites}
          onCharacterChange={handleSelectHanzi}
        />
      )}

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
