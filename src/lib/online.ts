import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClientMsg, ErrorCode, PublicRoom, ServerMsg, You } from './protocol'

export type ConnStatus = 'connecting' | 'open' | 'reconnecting'

/** Identificador estable de este dispositivo: permite recuperar el puesto tras recargar o perder señal. */
export function getClientId(): string {
  const KEY = 'planta-iot-duelo/client-id'
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return saved
    const id = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(KEY, id)
    return id
  } catch {
    return `c-${Math.random().toString(36).slice(2, 12)}`
  }
}

export function wsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws`
}

export function joinUrl(code: string): string {
  return `${window.location.origin}${window.location.pathname}#/unirse/${code}`
}

export interface RoomConnection {
  status: ConnStatus
  room: PublicRoom | null
  you: You | null
  error: { code: ErrorCode; message: string } | null
  kicked: string | null
  send: (msg: ClientMsg) => void
  clearError: () => void
  reset: () => void
}

/**
 * Conexión WebSocket a la sala con reconexión automática.
 * `resume` se llama en cada (re)conexión y devuelve el mensaje que recupera la sesión, si lo hay.
 */
export function useRoomConnection(enabled: boolean, resume: () => ClientMsg | null): RoomConnection {
  const [status, setStatus] = useState<ConnStatus>('connecting')
  const [room, setRoom] = useState<PublicRoom | null>(null)
  const [you, setYou] = useState<You | null>(null)
  const [error, setError] = useState<RoomConnection['error']>(null)
  const [kicked, setKicked] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const queue = useRef<ClientMsg[]>([])
  const resumeRef = useRef(resume)
  resumeRef.current = resume

  useEffect(() => {
    if (!enabled) return
    let stopped = false
    let attempt = 0
    let retryTimer: number | undefined

    const connect = () => {
      const ws = new WebSocket(wsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        attempt = 0
        setStatus('open')
        const r = resumeRef.current()
        if (r) ws.send(JSON.stringify(r))
        for (const m of queue.current.splice(0)) ws.send(JSON.stringify(m))
      }

      ws.onmessage = (ev) => {
        let msg: ServerMsg
        try {
          msg = JSON.parse(String(ev.data)) as ServerMsg
        } catch {
          return
        }
        switch (msg.t) {
          case 'state':
            setRoom(msg.room)
            setYou(msg.you)
            setError(null)
            setKicked(null)
            break
          case 'error':
            setError({ code: msg.code, message: msg.message })
            break
          case 'kicked':
            setKicked(msg.reason)
            setRoom(null)
            setYou(null)
            break
          case 'pong':
            break
        }
      }

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null
        if (stopped) return
        setStatus('reconnecting')
        attempt += 1
        retryTimer = window.setTimeout(connect, Math.min(8000, 400 * 2 ** attempt))
      }
    }

    setStatus('connecting')
    connect()

    // Mantiene viva la conexión a través de proxies y detecta redes caídas
    const ping = window.setInterval(() => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'ping' } satisfies ClientMsg))
    }, 20_000)

    // Al volver a la pestaña (p. ej. el celular se bloqueó), reconecta de inmediato
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const ws = wsRef.current
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        window.clearTimeout(retryTimer)
        connect()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      stopped = true
      window.clearTimeout(retryTimer)
      window.clearInterval(ping)
      document.removeEventListener('visibilitychange', onVisible)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [enabled])

  const send = useCallback((msg: ClientMsg) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    else queue.current.push(msg)
  }, [])

  const clearError = useCallback(() => setError(null), [])
  const reset = useCallback(() => {
    setRoom(null)
    setYou(null)
    setKicked(null)
    setError(null)
  }, [])

  return { status, room, you, error, kicked, send, clearError, reset }
}
