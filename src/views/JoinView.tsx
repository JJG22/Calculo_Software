import { useEffect, useState, type ReactNode } from 'react'
import { Keypad, isValidEntry } from '../components/Keypad'
import { FormulaG } from '../components/MathText'
import { Button, PLAYER_COLORS } from '../components/ui'
import { qty, usd } from '../lib/format'
import { getScenario, toUSD } from '../lib/model'
import { getClientId, useRoomConnection } from '../lib/online'
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH, normalizeCode } from '../lib/protocol'
import { MAX_MAINTENANCES, soloEfficiency, soloTier, type RoundRecord } from '../lib/scoring'
import { sfx } from '../lib/sound'
import { verdict } from '../lib/verdict'

const JOIN_KEY = 'planta-iot-duelo/join'

interface Joined {
  code: string
  name: string
}

function loadJoined(): Joined | null {
  try {
    const raw = sessionStorage.getItem(JOIN_KEY)
    return raw ? (JSON.parse(raw) as Joined) : null
  } catch {
    return null
  }
}

function saveJoined(j: Joined | null) {
  try {
    if (j) sessionStorage.setItem(JOIN_KEY, JSON.stringify(j))
    else sessionStorage.removeItem(JOIN_KEY)
  } catch {
    /* ignorar */
  }
}

export default function JoinView({ codeFromUrl }: { codeFromUrl: string }) {
  const clientId = getClientId()
  const urlCode = normalizeCode(codeFromUrl)
  const [joined, setJoinedState] = useState<Joined | null>(() => {
    const saved = loadJoined()
    // Si el QR apunta a otra sala distinta a la guardada, se empieza de cero
    return saved && (!urlCode || saved.code === urlCode) ? saved : null
  })
  const [code, setCode] = useState(urlCode || joined?.code || '')
  const [name, setName] = useState(joined?.name ?? '')
  const [formError, setFormError] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [leftMessage, setLeftMessage] = useState<string | null>(null)

  const setJoined = (j: Joined | null) => {
    saveJoined(j)
    setJoinedState(j)
  }

  const conn = useRoomConnection(joined !== null, () =>
    joined ? { t: 'player:join', clientId, code: joined.code, name: joined.name } : null,
  )
  const { room, you, error, kicked, send, status } = conn

  // Error al entrar (código malo, nombre repetido…): vuelve al formulario con el mensaje
  useEffect(() => {
    if (error && !room) {
      setFormError(error.message)
      setJoined(null)
    }
  }, [error, room])

  // El anfitrión vació la sala o nos sacó
  useEffect(() => {
    if (kicked) {
      setLeftMessage(kicked)
      setJoined(null)
    }
  }, [kicked])

  const me = room && you?.role === 'player' ? room.players.find((p) => p.id === you.playerId) : undefined
  const myIndex = room && me ? room.players.indexOf(me) : 0
  const color = PLAYER_COLORS[myIndex % PLAYER_COLORS.length]

  // Limpia el teclado al empezar una ronda nueva
  const round = room?.round ?? 0
  useEffect(() => {
    setValue('')
  }, [round])

  const submit = () => {
    if (!isValidEntry(value, MAX_MAINTENANCES)) return
    sfx.confirm()
    send({ t: 'player:submit', x: Number(value) })
  }

  const leave = () => {
    send({ t: 'player:leave' })
    setJoined(null)
    conn.reset()
  }

  /* ---------------- Formulario para entrar ---------------- */
  if (!joined) {
    const canJoin = normalizeCode(code).length === ROOM_CODE_LENGTH && name.trim().length > 0
    return (
      <Shell>
        {leftMessage && (
          <div className="mb-5 rounded-xl border border-ok/40 bg-ok/10 p-4 text-ok">{leftMessage}</div>
        )}
        <h1 className="text-3xl font-bold leading-tight">
          Entra al duelo de <span className="text-hazard">gerentes de planta</span>
        </h1>
        <p className="mt-2 text-ink-300">Escribe el código que aparece en la pantalla del stand.</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!canJoin) return
            setFormError(null)
            setLeftMessage(null)
            conn.reset()
            setJoined({ code: normalizeCode(code), name: name.trim() })
          }}
        >
          <label className="block">
            <span className="text-sm text-ink-400">Código de sala</span>
            <input
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              placeholder="ABCD"
              autoCapitalize="characters"
              autoComplete="off"
              inputMode="text"
              className="mt-1 h-16 w-full rounded-xl border border-ink-600 bg-ink-950 px-4 text-center font-mono text-4xl font-bold uppercase tracking-[0.3em] text-hazard outline-none placeholder:text-ink-700 focus:border-hazard"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-400">Tu nombre</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder="Ej. Laura"
              autoComplete="given-name"
              className="mt-1 h-14 w-full rounded-xl border border-ink-600 bg-ink-950 px-4 text-xl text-ink-100 outline-none placeholder:text-ink-600 focus:border-hazard"
            />
          </label>
          {formError && <p className="rounded-lg bg-alarm/10 p-3 text-sm text-alarm">{formError}</p>}
          <Button type="submit" disabled={!canJoin} className="h-14 w-full text-base">
            Entrar a la sala ▶
          </Button>
        </form>
      </Shell>
    )
  }

  /* ---------------- Conectando ---------------- */
  if (!room || !me) {
    return (
      <Shell>
        <div className="py-16 text-center">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-ink-400">Sala {joined.code}</div>
          <div className="mt-3 text-2xl font-bold">
            Conectando<span className="animate-blink">…</span>
          </div>
          <p className="mt-3 text-sm text-ink-400">Si tarda, revisa que tengas internet.</p>
          <button type="button" onClick={leave} className="mt-8 cursor-pointer text-sm text-ink-400 underline">
            Cancelar
          </button>
        </div>
      </Shell>
    )
  }

  const scenario = getScenario(room.scenarioId)

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full" style={{ background: color }} />
          <span className="text-lg font-bold" style={{ color }}>
            {me.name}
          </span>
        </div>
        <span className="font-mono text-xs text-ink-400">
          Sala {room.code}
          {status !== 'open' && <span className="ml-2 text-hazard">· reconectando…</span>}
        </span>
      </div>

      {room.phase === 'lobby' && (
        <div className="py-6 text-center">
          <div className="animate-pop text-6xl">✅</div>
          <h1 className="mt-4 text-3xl font-bold">¡Estás dentro!</h1>
          <p className="mt-2 text-ink-300">Mira la pantalla del stand. La ronda empieza cuando el equipo la inicie.</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {room.players.map((p, i) => (
              <li key={p.id} className="rounded-full border border-ink-600 px-3 py-1 font-mono text-sm">
                <span style={{ color: PLAYER_COLORS[i % PLAYER_COLORS.length] }}>●</span> {p.name}
              </li>
            ))}
          </ul>
          <button type="button" onClick={leave} className="mt-10 cursor-pointer text-sm text-ink-500 underline">
            Salir de la sala
          </button>
        </div>
      )}

      {room.phase === 'deciding' && !me.submitted && (
        <div>
          <h1 className="text-2xl font-bold leading-tight">¿Cuántos mantenimientos preventivos harás este mes?</h1>
          <div className="mt-3 rounded-xl border border-ink-700 bg-ink-950/60 p-3">
            <div className="text-xs text-ink-400">{scenario.name} · presupuesto {usd(scenario.budget)}</div>
            <div className="mt-1 overflow-x-auto text-base">
              <FormulaG s={scenario} />
            </div>
          </div>
          <div className="mt-4">
            <Keypad value={value} setValue={setValue} onSubmit={submit} max={MAX_MAINTENANCES} active accent={color} />
          </div>
          <p className="mt-3 text-center text-xs text-ink-500">De 0 a {MAX_MAINTENANCES}, hasta 2 decimales. Tapa tu pantalla 🤫</p>
        </div>
      )}

      {room.phase === 'deciding' && me.submitted && (
        <div className="py-10 text-center">
          <div className="animate-pop text-6xl">📨</div>
          <h1 className="mt-4 text-3xl font-bold">Decisión enviada</h1>
          <p className="mt-2 text-ink-300">Mira la pantalla grande para ver el resultado.</p>
          <ul className="mt-6 space-y-2">
            {room.players.map((p) => (
              <li key={p.id} className="flex justify-between rounded-lg border border-ink-700 px-4 py-2 text-sm">
                <span>{p.name}</span>
                <span className={p.submitted ? 'text-ok' : 'text-ink-500'}>{p.submitted ? '✓ listo' : 'pensando…'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {room.phase === 'reveal' && room.record && <MyResult record={room.record} name={me.name} color={color} />}
    </Shell>
  )
}

function MyResult({
  record,
  name,
  color,
}: {
  record: RoundRecord
  name: string
  color: string
}) {
  const mine = record.players.find((p) => p.name === name)
  useEffect(() => {
    if (mine?.winner) sfx.win()
  }, [mine?.winner])
  if (!mine) return null
  const v = verdict(mine, record.optimum)
  const scenario = getScenario(record.scenarioId)
  const tier = record.solo ? soloTier(mine.x, record.optimum) : null

  return (
    <div className="animate-rise text-center">
      <div className="text-6xl">{tier ? tier.emoji : mine.winner ? '🏆' : '📉'}</div>
      <h1 className="mt-3 text-4xl font-bold" style={{ color: mine.winner ? 'var(--color-hazard)' : color }}>
        {tier ? tier.label : mine.winner ? '¡Ganaste!' : 'Esta vez no'}
      </h1>
      {tier && (
        <div className="mt-1 text-ink-300">
          Eficiencia: <b className="text-hazard">{Math.round(Math.max(0, soloEfficiency(mine.x, scenario)) * 100)}%</b> del
          ahorro máximo
        </div>
      )}
      <div className="mt-1 font-mono text-3xl font-bold text-hazard">+{mine.points} pts</div>

      <div className="panel mt-6 space-y-2 p-4 text-left font-mono text-sm">
        <Row label="Tu decisión" value={`x = ${qty(mine.x)}`} />
        <Row label="Gasto G(x)" value={usd(toUSD(mine.cost))} />
        <Row
          label="Te quedó"
          value={usd(mine.left)}
          cls={mine.left < 0 ? 'text-alarm' : 'text-ok'}
        />
        <Row label="Presupuesto" value={usd(scenario.budget)} />
      </div>

      <div className="mt-4 rounded-xl bg-ink-900 p-4 text-left text-sm">
        <div className={`font-bold ${v.cls}`}>{v.title}</div>
        <div className="text-ink-300">{v.text}</div>
        <div className="mt-2 text-ink-400">
          Óptimo: x* ≈ {record.optimum.toFixed(2)} mantenimientos.
        </div>
      </div>
      <p className="mt-6 text-sm text-ink-500">
        {record.solo ? 'Espera a que el stand te dé otro intento.' : 'Espera la revancha o la siguiente pareja.'}
      </p>
    </div>
  )
}

function Row({ label, value, cls = '' }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-400">{label}</span>
      <span className={`tabular font-semibold ${cls}`}>{value}</span>
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="grid-bg min-h-screen">
      <div className="hazard-stripes h-1.5" />
      <div className="mx-auto max-w-md px-5 pb-12 pt-6">
        <div className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-400">
          <span className="size-2 rounded-full bg-hazard" /> Planta IoT · Gerentes en crisis
        </div>
        {children}
      </div>
    </div>
  )
}
