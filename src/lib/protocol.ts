/**
 * Protocolo del modo en línea (WebSocket en /ws).
 * Lo comparten el servidor (server/) y el navegador (src/).
 */
import type { RoundRecord } from './scoring'

export type OnlineMode = 'clasico' | 'experto'
export type RoomPhase = 'lobby' | 'deciding' | 'reveal'

export const MAX_ONLINE_PLAYERS = 4
export const MIN_ONLINE_PLAYERS = 2
export const MAX_NAME_LENGTH = 24
export const ROOM_CODE_LENGTH = 4
/** Sin I, O ni números: el código se lee en voz alta y se teclea en el celular sin confusiones. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

export interface PublicPlayer {
  id: string
  name: string
  connected: boolean
  submitted: boolean
}

/** Estado de la sala que ven todos. Nunca incluye las decisiones antes de revelar. */
export interface PublicRoom {
  code: string
  phase: RoomPhase
  mode: OnlineMode
  scenarioId: string
  round: number
  hostConnected: boolean
  players: PublicPlayer[]
  /** Solo presente en la fase 'reveal' */
  record: RoundRecord | null
}

export type You = { role: 'host' } | { role: 'player'; playerId: string }

export type ClientMsg =
  | { t: 'host:create'; clientId: string; mode: OnlineMode }
  | { t: 'host:resume'; clientId: string; code: string }
  | { t: 'host:mode'; mode: OnlineMode }
  | { t: 'host:start' }
  | { t: 'host:kick'; playerId: string }
  | { t: 'host:newPair' }
  | { t: 'player:join'; clientId: string; code: string; name: string }
  | { t: 'player:submit'; x: number }
  | { t: 'player:leave' }
  | { t: 'ping' }

export type ErrorCode =
  | 'bad_message'
  | 'room_not_found'
  | 'not_allowed'
  | 'room_full'
  | 'in_progress'
  | 'name_taken'
  | 'bad_name'
  | 'bad_value'
  | 'not_enough_players'

export type ServerMsg =
  | { t: 'state'; room: PublicRoom; you: You }
  | { t: 'error'; code: ErrorCode; message: string }
  | { t: 'kicked'; reason: string }
  | { t: 'pong' }

/* ---------------- Validación de mensajes entrantes ---------------- */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isStr = (v: unknown, max = 64): v is string => typeof v === 'string' && v.length <= max
const isMode = (v: unknown): v is OnlineMode => v === 'clasico' || v === 'experto'

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, ROOM_CODE_LENGTH)
}

/** Convierte lo recibido por el socket en un ClientMsg válido, o null. */
export function parseClientMsg(raw: unknown): ClientMsg | null {
  if (!isObj(raw) || typeof raw.t !== 'string') return null
  switch (raw.t) {
    case 'host:create':
      return isStr(raw.clientId) && isMode(raw.mode) ? { t: raw.t, clientId: raw.clientId, mode: raw.mode } : null
    case 'host:resume':
      return isStr(raw.clientId) && isStr(raw.code, 16)
        ? { t: raw.t, clientId: raw.clientId, code: normalizeCode(raw.code) }
        : null
    case 'host:mode':
      return isMode(raw.mode) ? { t: raw.t, mode: raw.mode } : null
    case 'host:kick':
      return isStr(raw.playerId) ? { t: raw.t, playerId: raw.playerId } : null
    case 'player:join':
      return isStr(raw.clientId) && isStr(raw.code, 16) && isStr(raw.name, 200)
        ? { t: raw.t, clientId: raw.clientId, code: normalizeCode(raw.code), name: raw.name }
        : null
    case 'player:submit':
      return typeof raw.x === 'number' ? { t: raw.t, x: raw.x } : null
    case 'host:start':
    case 'host:newPair':
    case 'player:leave':
    case 'ping':
      return { t: raw.t }
    default:
      return null
  }
}
