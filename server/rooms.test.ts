import { describe, expect, it } from 'vitest'
import type { PublicRoom, ServerMsg } from '../src/lib/protocol'
import { RoomManager, type Conn } from './rooms'

class FakeConn implements Conn {
  inbox: ServerMsg[] = []
  send(msg: ServerMsg) {
    this.inbox.push(msg)
  }
  last(): ServerMsg | undefined {
    return this.inbox.at(-1)
  }
  room(): PublicRoom {
    const states = this.inbox.filter((m): m is Extract<ServerMsg, { t: 'state' }> => m.t === 'state')
    const s = states.at(-1)
    if (!s) throw new Error('sin estado')
    return s.room
  }
  lastError() {
    const errs = this.inbox.filter((m): m is Extract<ServerMsg, { t: 'error' }> => m.t === 'error')
    return errs.at(-1)?.code
  }
}

function setup() {
  const m = new RoomManager()
  const host = new FakeConn()
  m.handle(host, { t: 'host:create', clientId: 'h', mode: 'clasico' })
  const code = host.room().code
  const a = new FakeConn()
  const b = new FakeConn()
  m.handle(a, { t: 'player:join', clientId: 'a', code, name: 'Ana' })
  m.handle(b, { t: 'player:join', clientId: 'b', code, name: 'Beto' })
  return { m, host, a, b, code }
}

describe('salas en línea', () => {
  it('crea una sala con código de 4 letras', () => {
    const { host, code } = setup()
    expect(code).toMatch(/^[A-Z]{4}$/)
    expect(host.room().players.map((p) => p.name)).toEqual(['Ana', 'Beto'])
  })

  it('rechaza código inexistente y nombre repetido', () => {
    const { m, code } = setup()
    const c = new FakeConn()
    m.handle(c, { t: 'player:join', clientId: 'c', code: 'ZZZZ', name: 'Caro' })
    expect(c.lastError()).toBe('room_not_found')
    m.handle(c, { t: 'player:join', clientId: 'c', code, name: 'ana' })
    expect(c.lastError()).toBe('name_taken')
  })

  it('no revela decisiones hasta que todos envían, y luego puntúa', () => {
    const { m, host, a, b } = setup()
    m.handle(host, { t: 'host:start' })
    expect(host.room().phase).toBe('deciding')

    m.handle(a, { t: 'player:submit', x: 2 })
    const mid = host.room()
    expect(mid.phase).toBe('deciding')
    expect(mid.record).toBeNull()
    expect(mid.players.find((p) => p.name === 'Ana')?.submitted).toBe(true)
    expect(JSON.stringify(b.inbox)).not.toContain('"x":2')

    m.handle(b, { t: 'player:submit', x: 6 })
    const end = host.room()
    expect(end.phase).toBe('reveal')
    const winner = end.record?.players.find((p) => p.winner)
    expect(winner?.name).toBe('Beto')
    expect(a.room().phase).toBe('reveal')
  })

  it('solo el anfitrión puede iniciar', () => {
    const { m, a } = setup()
    m.handle(a, { t: 'host:start' })
    expect(a.lastError()).toBe('not_allowed')
  })

  it('valida el rango de x', () => {
    const { m, host, a } = setup()
    m.handle(host, { t: 'host:start' })
    m.handle(a, { t: 'player:submit', x: 99 })
    expect(a.lastError()).toBe('bad_value')
  })

  it('un jugador que se reconecta recupera su puesto', () => {
    const { m, host, a, code } = setup()
    m.disconnect(a)
    expect(host.room().players.find((p) => p.name === 'Ana')?.connected).toBe(false)
    const a2 = new FakeConn()
    m.handle(a2, { t: 'player:join', clientId: 'a', code, name: 'Ana' })
    expect(host.room().players).toHaveLength(2)
    expect(host.room().players.find((p) => p.name === 'Ana')?.connected).toBe(true)
  })

  it('el anfitrión puede reanudar su sala tras recargar', () => {
    const { m, host, code } = setup()
    m.disconnect(host)
    const host2 = new FakeConn()
    m.handle(host2, { t: 'host:resume', clientId: 'h', code })
    expect(host2.room().code).toBe(code)
    const intruder = new FakeConn()
    m.handle(intruder, { t: 'host:resume', clientId: 'otro', code })
    expect(intruder.lastError()).toBe('room_not_found')
  })

  it('siguiente pareja vacía la sala y avisa a los jugadores', () => {
    const { m, host, a } = setup()
    m.handle(host, { t: 'host:newPair' })
    expect(host.room().players).toHaveLength(0)
    expect(a.last()?.t).toBe('kicked')
  })

  it('expulsar al único que faltaba por decidir no bloquea la ronda', () => {
    const { m, host, a, b, code } = setup()
    const c = new FakeConn()
    m.handle(c, { t: 'player:join', clientId: 'c', code, name: 'Caro' })
    m.handle(host, { t: 'host:start' })
    m.handle(a, { t: 'player:submit', x: 5 })
    m.handle(b, { t: 'player:submit', x: 7 })
    const caro = host.room().players.find((p) => p.name === 'Caro')!
    m.handle(host, { t: 'host:kick', playerId: caro.id })
    expect(host.room().phase).toBe('reveal')
  })
})

describe('reto en solitario en línea', () => {
  it('se puede iniciar con un solo jugador y se puntúa contra el óptimo', () => {
    const m = new RoomManager()
    const host = new FakeConn()
    m.handle(host, { t: 'host:create', clientId: 'h', mode: 'clasico' })
    const code = host.room().code
    const a = new FakeConn()
    m.handle(a, { t: 'player:join', clientId: 'a', code, name: 'Ana' })
    m.handle(host, { t: 'host:start' })
    expect(host.room().phase).toBe('deciding')
    m.handle(a, { t: 'player:submit', x: 5.6 })
    const room = host.room()
    expect(room.phase).toBe('reveal')
    expect(room.record?.solo).toBe(true)
    expect(room.record?.players[0].points).toBe(4)
  })

  it('no inicia una sala vacía', () => {
    const m = new RoomManager()
    const host = new FakeConn()
    m.handle(host, { t: 'host:create', clientId: 'h', mode: 'clasico' })
    m.handle(host, { t: 'host:start' })
    expect(host.lastError()).toBe('not_enough_players')
  })
})
