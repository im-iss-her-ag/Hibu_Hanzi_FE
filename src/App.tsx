import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PenTool, Layers } from 'lucide-react'
import type { HskLevel, HskStandard } from './core'
import { pickRandom } from './core'
import { api } from './api'
import { Navbar } from './components/Navbar'
import { LeftSidebar } from './components/LeftSidebar'
import { StudioCenter } from './components/StudioCenter'
import { RightBreakdown } from './components/RightBreakdown'
import { SearchModal } from './components/SearchModal'
import { FavoritesModal } from './components/FavoritesModal'
import { PronunciationModal } from './components/PronunciationModal'
import { PinyinChartModal } from './components/PinyinChartModal'

export function App() {
  // Query full bundle (server or local offline dataset)
  const bundle = useQuery({
    queryKey: ['bundle'],
    queryFn: () => api.getBundle(),
  })

  const allCharacters = useMemo(() => bundle.data?.characters ?? [], [bundle.data?.characters])
  const allWords = useMemo(() => bundle.data?.words ?? [], [bundle.data?.words])

  // Filters & State
  const [standard, setStandard] = useState<HskStandard>('2.0')
  const [selectedLevel, setSelectedLevel] = useState<HskLevel | null>(null)
  const [currentHanzi, setCurrentHanzi] = useState<string | null>(null)

  // Mobile state
  const [mobileTab, setMobileTab] = useState<'canvas' | 'breakdown'>('canvas')
  const [isMobileListOpen, setIsMobileListOpen] = useState(false)

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

  // Appearance
  const [fontStyle, setFontStyle] = useState<'calligraphy' | 'serif' | 'sans'>('calligraphy')
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

  // Filter pool based on standard & level
  const filteredCharacters = useMemo(() => {
    if (selectedLevel === null) return allCharacters
    return allCharacters.filter((c) => {
      const lvl = standard === '2.0' ? c.hsk2Level : c.hsk3Level
      return lvl === selectedLevel
    })
  }, [allCharacters, standard, selectedLevel])

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
          setIsMobileListOpen(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev, pickNextRandom, handleToggleFavorite])

  const toggleFont = () => {
    setFontStyle((prev) =>
      prev === 'calligraphy' ? 'serif' : prev === 'serif' ? 'sans' : 'calligraphy',
    )
  }

  return (
    <div className="studio-app-root">
      {/* Top Header / Navigation */}
      <Navbar
        fontStyle={fontStyle}
        onToggleFont={toggleFont}
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
            {/* Mobile Tab Switcher: "Zen Floating Widget" Tabs */}
            <div className="mobile-zen-tabbar" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mobileTab === 'canvas'}
                className={`zen-tab-btn ${mobileTab === 'canvas' ? 'active' : ''}`}
                onClick={() => setMobileTab('canvas')}
              >
                <PenTool size={15} />
                <span>Chữ & Nét viết</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileTab === 'breakdown'}
                className={`zen-tab-btn ${mobileTab === 'breakdown' ? 'active' : ''}`}
                onClick={() => setMobileTab('breakdown')}
              >
                <Layers size={15} />
                <span>Chiết tự & Hán Việt</span>
              </button>
            </div>

            {/* Studio 3-Column Split Workspace: Always preserved */}
            <div className={`studio-split-layout mobile-view-${mobileTab}`}>
              {/* Left Column: Character Library & Filters */}
              <LeftSidebar
                characters={allCharacters}
                activeHanzi={activeChar?.hanzi ?? null}
                onSelectHanzi={(h) => setCurrentHanzi(h)}
                standard={standard}
                onStandardChange={setStandard}
                selectedLevel={selectedLevel}
                onLevelChange={setSelectedLevel}
                favorites={favorites}
                isOpenMobile={isMobileListOpen}
                onCloseMobile={() => setIsMobileListOpen(false)}
              />

              {/* Center Column: Hero Canvas OR In-Place Empty State */}
              <div className="studio-col-center">
                {activeChar ? (
                  <StudioCenter
                    character={activeChar}
                    detail={detailQuery.data ?? null}
                    currentIndex={currentIndex}
                    totalCount={filteredCharacters.length}
                    isFavorite={favorites.includes(activeChar.hanzi)}
                    fontStyle={fontStyle}
                    onToggleFont={toggleFont}
                    onToggleFavorite={handleToggleFavorite}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    onRandom={pickNextRandom}
                    onOpenMobileList={() => setIsMobileListOpen(true)}
                    onOpenPronunciation={(pinyin, hanViet, meaningVi) =>
                      setPronounceTarget({
                        hanzi: activeChar.hanzi,
                        pinyin,
                        hanViet,
                        meaningVi,
                      })
                    }
                  />
                ) : (
                  <div className="center-empty-workspace">
                    <div className="empty-calligraphy-seal" aria-hidden="true">無</div>
                    <div className="empty-workspace-content">
                      <h3 className="empty-workspace-title">Chưa có chữ Hán ở bộ lọc này</h3>
                      <p className="empty-workspace-desc">
                        Cấp độ {standard === '2.0' ? 'HSK 2.0' : 'HSK 3.0'} {selectedLevel ? `Cấp ${selectedLevel}` : ''} hiện chưa có từ trong gói dữ liệu hiện tại.
                      </p>
                      <button
                        type="button"
                        className="empty-reset-pill-btn"
                        onClick={() => setSelectedLevel(null)}
                      >
                        Xem tất cả cấp độ
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Deep Hán Việt & Chiết Tự Breakdown */}
              <div className="studio-col-right">
                <RightBreakdown
                  detail={detailQuery.data ?? null}
                  isLoading={detailQuery.isPending}
                  onSelectHanzi={(h) => setCurrentHanzi(h)}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Search Modal */}
      {showSearch && (
        <SearchModal
          characters={allCharacters}
          words={allWords}
          onSelectHanzi={(h) => {
            setCurrentHanzi(h)
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
            setCurrentHanzi(h)
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
              hanzi: activeChar?.hanzi || '音',
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
