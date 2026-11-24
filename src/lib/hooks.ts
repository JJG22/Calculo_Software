import { useCallback, useEffect, useState } from 'react'
import type { RoundRecord } from './scoring'

/* ---------------- Rutas por hash (#/modelo, #/duelo, #/marcador) ---------------- */

export type Route = 'modelo' | 'duelo' | 'marcador'
const ROUTES: Route[] = ['modelo', 'duelo', 'marcador']

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '')
  return (ROUTES as string[]).includes(h) ? (h as Route) : 'modelo'
}

export function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(parseHash)
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const go = useCallback((r: Route) => {
    window.location.hash = `/${r}`
  }, [])
  return [route, go]
}

/* ---------------- Historial de rondas persistido en localStorage ---------------- */

const HISTORY_KEY = 'planta-iot-duelo/historial/v1'

function loadHistory(): RoundRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const data: unknown = JSON.parse(raw)
    return Array.isArray(data) ? (data as RoundRecord[]) : []
  } catch {
    return []
  }
}

export interface HistoryStore {
  history: RoundRecord[]
  add: (r: RoundRecord) => void
  removeLast: () => void
  clear: () => void
}

export function useHistory(): HistoryStore {
  const [history, setHistory] = useState<RoundRecord[]>(loadHistory)

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    } catch {
      /* almacenamiento lleno o bloqueado: el juego sigue en memoria */
    }
  }, [history])

  const add = useCallback((r: RoundRecord) => setHistory((h) => [...h, r]), [])
  const removeLast = useCallback(() => setHistory((h) => h.slice(0, -1)), [])
  const clear = useCallback(() => setHistory([]), [])

  return { history, add, removeLast, clear }
}

/* ---------------- Reloj y animaciones ---------------- */

export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

/** Progreso 0 → 1 durante `durationMs`; se reinicia cuando cambia `key`. */
export function useProgress(durationMs: number, key: unknown): number {
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    setP(0)
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / durationMs)
      setP(k)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [durationMs, key])
  return p
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
