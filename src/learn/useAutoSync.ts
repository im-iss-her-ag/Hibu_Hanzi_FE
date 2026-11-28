import { useEffect, useRef } from 'react'
import { bindFavorites, hasUnsyncedChanges, isSyncEnabled, subscribeSync, syncNow } from './sync'
import { subscribeLearnData } from './srs'
import { subscribeDaily } from './daily'

/**
 * Keeps this device in sync while the app is open (only does anything once sync is turned on).
 *   - shortly after the app opens
 *   - when the tab/window comes back (focus / visible / back online), at most every 30 s
 *   - ~8 s after local changes (a review, a favourite), only if there is something new to upload
 *   - every 5 minutes while visible
 * One sync at a time (syncNow dedupes). After a failure it backs off (1, 2, 4, ... up to 15 min), so an
 * offline phone or a down server is not hammered; any later success resets it. Nothing re-uploads
 * unless local data differs from the last synced copy, so applying a merge cannot loop.
 */

const FOCUS_THROTTLE_MS = 30_000
const DEBOUNCE_MS = 8_000
const POLL_MS = 5 * 60_000
const START_DELAY_MS = 2_000
const MAX_BACKOFF_MS = 15 * 60_000

export function useAutoSync(favorites: string[], setFavorites: (next: string[]) => void) {
  const favRef = useRef(favorites)
  favRef.current = favorites
  const setRef = useRef(setFavorites)
  setRef.current = setFavorites
  const scheduleRef = useRef<() => void>(() => {})

  useEffect(() => {
    bindFavorites({ get: () => favRef.current, set: (n) => { favRef.current = n; setRef.current(n) } })
    return () => bindFavorites(null)
  }, [])

  useEffect(() => {
    let lastAttempt = 0
    let failures = 0
    let blockedUntil = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const run = async (needChange: boolean) => {
      if (!isSyncEnabled() || document.visibilityState === 'hidden') return
      const now = Date.now()
      if (now < blockedUntil) return
      if (needChange && !hasUnsyncedChanges()) return
      lastAttempt = now
      const out = await syncNow()
      if (out !== 'ok') {
        failures++
        blockedUntil = Date.now() + Math.min(MAX_BACKOFF_MS, 60_000 * 2 ** (failures - 1))
      } else {
        failures = 0
        blockedUntil = 0
      }
    }
    const onReturn = () => {
      if (Date.now() - lastAttempt >= FOCUS_THROTTLE_MS) void run(false)
    }
    const schedule = () => {
      if (!isSyncEnabled()) return
      clearTimeout(timer)
      timer = setTimeout(() => void run(true), DEBOUNCE_MS)
    }
    scheduleRef.current = schedule

    const onVisible = () => {
      if (document.visibilityState === 'visible') onReturn()
    }
    const first = setTimeout(() => void run(false), START_DELAY_MS)
    const poll = setInterval(() => void run(false), POLL_MS)
    const offLearn = subscribeLearnData(schedule)
    const offDaily = subscribeDaily(schedule) // goal / level changes, activity log
    // Turning sync on from the UI must not wait for a trigger, but must not double-run either.
    const offSync = subscribeSync(() => {
      if (!isSyncEnabled()) clearTimeout(timer)
    })
    window.addEventListener('focus', onReturn)
    window.addEventListener('online', onReturn)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(first)
      clearTimeout(timer)
      clearInterval(poll)
      offLearn()
      offDaily()
      offSync()
      window.removeEventListener('focus', onReturn)
      window.removeEventListener('online', onReturn)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Favourites are React state, not in the learn store: schedule on their changes too.
  useEffect(() => {
    scheduleRef.current()
  }, [favorites])
}
