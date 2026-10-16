import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { HskLevel, HskStandard } from './core'
import { pickRandom } from './core'
import { api } from './api'
import { Navbar } from './components/Navbar'
import { WidgetCard } from './components/WidgetCard'
import { HanziWriterModal } from './components/HanziWriterModal'
import { DetailModal } from './components/DetailModal'
import { SearchModal } from './components/SearchModal'
import { FavoritesModal } from './components/FavoritesModal'

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

  // Timer cycle
  const [timerSeconds, setTimerSeconds] = useState<number>(0)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false)

  // Modals
  const [showWriter, setShowWriter] = useState<boolean>(false)
  const [showDetail, setShowDetail] = useState<boolean>(false)
  const [showSearch, setShowSearch] = useState<boolean>(false)
  const [showFavorites, setShowFavorites] = useState<boolean>(false)

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

  // Timer auto-cycle countdown effect
  useEffect(() => {
    if (timerSeconds <= 0 || isTimerPaused) return

    setTimeRemaining(timerSeconds)
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          pickNextRandom()
          return timerSeconds
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timerSeconds, isTimerPaused, pickNextRandom])

  // Toggle favorite
  const handleToggleFavorite = () => {
    if (!activeChar) return
    setFavorites((prev) =>
      prev.includes(activeChar.hanzi)
        ? prev.filter((h) => h !== activeChar.hanzi)
        : [...prev, activeChar.hanzi],
    )
  }

  // Fetch character details for the modal
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
        case 'w':
        case 'W':
          e.preventDefault()
          setShowWriter(true)
          break
        case 'd':
        case 'D':
          e.preventDefault()
          setShowDetail(true)
          break
        case 'Escape':
          setShowWriter(false)
          setShowDetail(false)
          setShowSearch(false)
          setShowFavorites(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev, pickNextRandom, activeChar])

  const toggleFont = () => {
    setFontStyle((prev) =>
      prev === 'calligraphy' ? 'serif' : prev === 'serif' ? 'sans' : 'calligraphy',
    )
  }

  return (
    <div className="app-layout">
      {/* Top Navigation */}
      <Navbar
        standard={standard}
        onStandardChange={setStandard}
        selectedLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        timerSeconds={timerSeconds}
        onTimerChange={(sec) => {
          setTimerSeconds(sec)
          setTimeRemaining(sec)
        }}
        isTimerPaused={isTimerPaused}
        onToggleTimerPause={() => setIsTimerPaused(!isTimerPaused)}
        timeRemaining={timeRemaining}
        fontStyle={fontStyle}
        onToggleFont={toggleFont}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        favoritesCount={favorites.length}
        onOpenFavorites={() => setShowFavorites(true)}
        onOpenSearch={() => setShowSearch(true)}
      />

      {/* Main Content Area */}
      <main className="main-content-viewport">
        {bundle.isPending && (
          <div className="state-card loading-card">
            <div className="spinner-ring" />
            <p>Đang chuẩn bị dữ liệu Hán tự…</p>
          </div>
        )}

        {bundle.isError && (
          <div className="state-card error-card">
            <p className="error-title">Chưa tải được dữ liệu</p>
            <p className="error-sub">Vui lòng kiểm tra lại kết nối và thử lại.</p>
            <button type="button" className="pill-btn active" onClick={() => bundle.refetch()}>
              Thử lại
            </button>
          </div>
        )}

        {bundle.isSuccess && activeChar && (
          <WidgetCard
            character={activeChar}
            currentIndex={currentIndex}
            totalCount={filteredCharacters.length}
            isFavorite={favorites.includes(activeChar.hanzi)}
            fontStyle={fontStyle}
            onToggleFavorite={handleToggleFavorite}
            onOpenWriter={() => setShowWriter(true)}
            onOpenDetail={() => setShowDetail(true)}
            onNext={handleNext}
            onPrev={handlePrev}
            onRandom={pickNextRandom}
          />
        )}

        {bundle.isSuccess && filteredCharacters.length === 0 && (
          <div className="state-card empty-card">
            <p>Không có chữ nào thuộc cấp độ HSK này.</p>
            <button
              type="button"
              className="pill-btn active"
              onClick={() => setSelectedLevel(null)}
            >
              Xem tất cả cấp độ
            </button>
          </div>
        )}

        {/* Shortcuts guide */}
        <footer className="keyboard-shortcuts-bar">
          <span className="shortcut-item">
            <kbd>Space</kbd> Chữ ngẫu nhiên
          </span>
          <span className="shortcut-item">
            <kbd>→</kbd> Tiếp
          </span>
          <span className="shortcut-item">
            <kbd>←</kbd> Trước
          </span>
          <span className="shortcut-item">
            <kbd>W</kbd> Nét viết
          </span>
          <span className="shortcut-item">
            <kbd>D</kbd> Chiết tự
          </span>
          <span className="shortcut-item">
            <kbd>F</kbd> Lưu
          </span>
          <span className="shortcut-item">
            <kbd>Ctrl+K</kbd> Tìm kiếm
          </span>
        </footer>
      </main>

      {/* Stroke Order Animation & Practice Modal */}
      {showWriter && activeChar && (
        <HanziWriterModal
          hanzi={activeChar.hanzi}
          pinyin={activeChar.readings[0]?.pinyin}
          hanViet={activeChar.readings[0]?.hanViet ?? undefined}
          meaningVi={activeChar.readings[0]?.meaningVi}
          strokeCount={detailQuery.data?.character.strokeCount}
          onClose={() => setShowWriter(false)}
        />
      )}

      {/* Chiết tự & Radical Detail Modal */}
      {showDetail && detailQuery.data && (
        <DetailModal
          detail={detailQuery.data}
          onSelectHanzi={(h) => {
            setCurrentHanzi(h)
            setShowDetail(false)
          }}
          onOpenWriter={() => {
            setShowDetail(false)
            setShowWriter(true)
          }}
          onClose={() => setShowDetail(false)}
        />
      )}

      {/* Search Modal */}
      {showSearch && (
        <SearchModal
          characters={allCharacters}
          words={allWords}
          onSelectHanzi={(h) => setCurrentHanzi(h)}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Favorites Modal */}
      {showFavorites && (
        <FavoritesModal
          favorites={favorites}
          characters={allCharacters}
          onSelectHanzi={(h) => setCurrentHanzi(h)}
          onRemoveFavorite={(h) => setFavorites((prev) => prev.filter((fav) => fav !== h))}
          onClearAll={() => setFavorites([])}
          onClose={() => setShowFavorites(false)}
        />
      )}
    </div>
  )
}
