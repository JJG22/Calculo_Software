import { BASE_SCENARIO, EXPERT_SCENARIOS, type Scenario } from '../src/lib/model'
import {
  MAX_NAME_LENGTH,
  MAX_ONLINE_PLAYERS,
  MIN_ONLINE_PLAYERS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type ClientMsg,
  type ErrorCode,
  type OnlineMode,
  type PublicRoom,
  type RoomPhase,
  type ServerMsg,
} from '../src/lib/protocol'
import { MAX_MAINTENANCES, scoreRound, type RoundRecord } from '../src/lib/scoring'

/** Cualquier cosa a la que se le pueda enviar un mensaje (un WebSocket, o un doble en las pruebas). */
export interface Conn {
  send(msg: ServerMsg): void
}

interface Player {
  id: string
  clientId: string
  name: string
  conn: Conn | null
  x: number | null
}

interface Room {
  code: string
  hostClientId: string
  host: Conn | null
  mode: OnlineMode
  scenario: Scenario
  phase: RoomPhase
  round: number
  players: Player[]
  record: RoundRecord | null
  lastActivity: number
}

type Binding = { code: string; role: 'host' } | { code: string; role: 'player'; playerId: string }

const ERRORS: Record<ErrorCode, string> = {
  bad_message: 'Mensaje inválido.',
  room_not_found: 'No existe una sala con ese código. Revísalo en la pantalla del stand.',
  not_allowed: 'No tienes permiso para hacer eso.',
  room_full: `La sala está llena (máximo ${MAX_ONLINE_PLAYERS} gerentes).`,
  in_progress: 'Hay una ronda en curso. Espera a que termine para entrar.',
  name_taken: 'Ese nombre ya está en la sala. Usa otro.',
  bad_name: `Escribe un nombre de 1 a ${MAX_NAME_LENGTH} caracteres.`,
  bad_value: `El número de mantenimientos debe estar entre 0 y ${MAX_MAINTENANCES}.`,
  not_enough_players: `Se necesitan al menos ${MIN_ONLINE_PLAYERS} gerentes conectados.`,
}

export class RoomManager {
  readonly rooms = new Map<string, Room>()
  private bindings = new Map<Conn, Binding>()
  private seq = 0

  constructor(
    private now: () => number = Date.now,
    private random: () => number = Math.random,
  ) {}

  /* ---------------- Entrada principal ---------------- */

  handle(conn: Conn, msg: ClientMsg): void {
    switch (msg.t) {
      case 'ping':
        conn.send({ t: 'pong' })
        return
      case 'host:create':
        return this.create(conn, msg.clientId, msg.mode)
      case 'host:resume':
        return this.resumeHost(conn, msg.clientId, msg.code)
      case 'player:join':
        return this.join(conn, msg.clientId, msg.code, msg.name)
      default:
        break
    }

    const binding = this.bindings.get(conn)
    const room = binding && this.rooms.get(binding.code)
    if (!binding || !room) return this.fail(conn, 'not_allowed')
    room.lastActivity = this.now()

    if (binding.role === 'host') {
      switch (msg.t) {
        case 'host:mode':
          room.mode = msg.mode
          if (room.phase !== 'deciding') room.scenario = msg.mode === 'clasico' ? BASE_SCENARIO : room.scenario
          return this.broadcast(room)
        case 'host:start':
          return this.start(conn, room)
        case 'host:kick':
          return this.removePlayer(room, msg.playerId, 'El anfitrión te sacó de la sala.')
        case 'host:newPair':
          for (const p of [...room.players]) this.removePlayer(room, p.id, '¡Gracias por jugar! Turno de la siguiente pareja.', false)
          room.phase = 'lobby'
          room.record = null
          return this.broadcast(room)
        default:
          return this.fail(conn, 'not_allowed')
      }
    }

    const playerId = binding.playerId
    switch (msg.t) {
      case 'player:submit':
        return this.submit(conn, room, playerId, msg.x)
      case 'player:leave':
        return this.removePlayer(room, playerId, null)
      default:
        return this.fail(conn, 'not_allowed')
    }
  }

  /** El socket se cerró: se conserva el puesto para que pueda reconectarse. */
  disconnect(conn: Conn): void {
    const binding = this.bindings.get(conn)
    this.bindings.delete(conn)
    if (!binding) return
    const room = this.rooms.get(binding.code)
    if (!room) return
    if (binding.role === 'host') {
      if (room.host === conn) room.host = null
    } else {
      const p = room.players.find((pl) => pl.id === binding.playerId)
      if (p && p.conn === conn) p.conn = null
    }
    this.broadcast(room)
  }

  /** Elimina salas abandonadas. */
  sweep(abandonedMs = 30 * 60_000, maxIdleMs = 6 * 3600_000): number {
    const t = this.now()
    let removed = 0
    for (const room of [...this.rooms.values()]) {
      const idle = t - room.lastActivity
      if ((room.host === null && idle > abandonedMs) || idle > maxIdleMs) {
        for (const p of room.players) if (p.conn) this.bindings.delete(p.conn)
        if (room.host) this.bindings.delete(room.host)
        this.rooms.delete(room.code)
        removed++
      }
    }
    return removed
  }

  /* ---------------- Anfitrión ---------------- */

  private create(conn: Conn, clientId: string, mode: OnlineMode) {
    this.unbind(conn)
    const room: Room = {
      code: this.newCode(),
      hostClientId: clientId,
      host: conn,
      mode,
      scenario: BASE_SCENARIO,
      phase: 'lobby',
      round: 0,
      players: [],
      record: null,
      lastActivity: this.now(),
    }
    this.rooms.set(room.code, room)
    this.bindings.set(conn, { code: room.code, role: 'host' })
    this.broadcast(room)
  }

  private resumeHost(conn: Conn, clientId: string, code: string) {
    const room = this.rooms.get(code)
    if (!room || room.hostClientId !== clientId) return this.fail(conn, 'room_not_found')
    this.unbind(conn)
    if (room.host && room.host !== conn) this.bindings.delete(room.host)
    room.host = conn
    room.lastActivity = this.now()
    this.bindings.set(conn, { code, role: 'host' })
    this.broadcast(room)
  }

  private start(conn: Conn, room: Room) {
    if (room.players.length < MIN_ONLINE_PLAYERS) return this.fail(conn, 'not_enough_players')
    room.scenario = room.mode === 'clasico' ? BASE_SCENARIO : this.pickExpert(room.scenario)
    room.phase = 'deciding'
    room.round += 1
    room.record = null
    for (const p of room.players) p.x = null
    this.broadcast(room)
  }

  /* ---------------- Jugadores ---------------- */

  private join(conn: Conn, clientId: string, code: string, rawName: string) {
    const room = this.rooms.get(code)
    if (!room) return this.fail(conn, 'room_not_found')

    // Reconexión del mismo dispositivo: recupera su puesto
    const existing = room.players.find((p) => p.clientId === clientId)
    if (existing) {
      this.unbind(conn)
      if (existing.conn && existing.conn !== conn) this.bindings.delete(existing.conn)
      existing.conn = conn
      this.bindings.set(conn, { code, role: 'player', playerId: existing.id })
      room.lastActivity = this.now()
      return this.broadcast(room)
    }

    const name = rawName.trim().replace(/\s+/g, ' ')
    if (name.length < 1 || name.length > MAX_NAME_LENGTH) return this.fail(conn, 'bad_name')
    if (room.phase !== 'lobby') return this.fail(conn, 'in_progress')
    if (room.players.length >= MAX_ONLINE_PLAYERS) return this.fail(conn, 'room_full')
    const key = name.toLocaleLowerCase('es')
    if (room.players.some((p) => p.name.toLocaleLowerCase('es') === key)) return this.fail(conn, 'name_taken')

    this.unbind(conn)
    const player: Player = { id: `p${++this.seq}`, clientId, name, conn, x: null }
    room.players.push(player)
    room.lastActivity = this.now()
    this.bindings.set(conn, { code, role: 'player', playerId: player.id })
    this.broadcast(room)
  }

  private submit(conn: Conn, room: Room, playerId: string, x: number) {
    if (room.phase !== 'deciding') return this.fail(conn, 'not_allowed')
    if (!Number.isFinite(x) || x < 0 || x > MAX_MAINTENANCES) return this.fail(conn, 'bad_value')
    const p = room.players.find((pl) => pl.id === playerId)
    if (!p) return this.fail(conn, 'not_allowed')
    p.x = Math.round(x * 100) / 100
    this.maybeFinish(room)
    this.broadcast(room)
  }

  private maybeFinish(room: Room) {
    if (room.phase !== 'deciding') return
    if (room.players.length < MIN_ONLINE_PLAYERS) {
      room.phase = 'lobby'
      return
    }
    if (room.players.every((p) => p.x !== null)) {
      room.record = scoreRound(
        room.players.map((p) => ({ name: p.name, x: p.x as number })),
        room.scenario,
      )
      room.phase = 'reveal'
    }
  }

  private removePlayer(room: Room, playerId: string, reason: string | null, rebroadcast = true) {
    const idx = room.players.findIndex((p) => p.id === playerId)
    if (idx === -1) return
    const [p] = room.players.splice(idx, 1)
    if (p.conn) {
      this.bindings.delete(p.conn)
      if (reason) p.conn.send({ t: 'kicked', reason })
    }
    this.maybeFinish(room)
    if (rebroadcast) this.broadcast(room)
  }

  /* ---------------- Utilidades ---------------- */

  private publicRoom(room: Room): PublicRoom {
    return {
      code: room.code,
      phase: room.phase,
      mode: room.mode,
      scenarioId: room.scenario.id,
      round: room.round,
      hostConnected: room.host !== null,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        connected: p.conn !== null,
        submitted: p.x !== null,
      })),
      record: room.phase === 'reveal' ? room.record : null,
    }
  }

  private broadcast(room: Room) {
    const pub = this.publicRoom(room)
    room.host?.send({ t: 'state', room: pub, you: { role: 'host' } })
    for (const p of room.players) p.conn?.send({ t: 'state', room: pub, you: { role: 'player', playerId: p.id } })
  }

  private fail(conn: Conn, code: ErrorCode) {
    conn.send({ t: 'error', code, message: ERRORS[code] })
  }

  /** Si este socket ya estaba en otra sala, lo suelta (sin borrar su puesto). */
  private unbind(conn: Conn) {
    const prev = this.bindings.get(conn)
    if (!prev) return
    this.disconnect(conn)
  }

  private newCode(): string {
    for (;;) {
      let code = ''
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_ALPHABET[Math.floor(this.random() * ROOM_CODE_ALPHABET.length)]
      }
      if (!this.rooms.has(code)) return code
    }
  }

  private pickExpert(previous: Scenario): Scenario {
    const pool = EXPERT_SCENARIOS.filter((s) => s.id !== previous.id)
    return pool[Math.floor(this.random() * pool.length)]
  }
}
