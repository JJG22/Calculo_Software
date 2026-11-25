import { useState } from 'react'
import { Keypad, isValidEntry } from '../components/Keypad'
import { FormulaG } from '../components/MathText'
import { HostRoom } from '../components/online/HostRoom'
import { RoundReveal } from '../components/RoundReveal'
import { Button, PLAYER_COLORS, Tag } from '../components/ui'
import { mmss, usd } from '../lib/format'
import { useNow } from '../lib/hooks'
import { BASE_SCENARIO, EXPERT_SCENARIOS, type Scenario } from '../lib/model'
import {
  BONUS_POINTS,
  BONUS_TOLERANCE,
  MAX_MAINTENANCES,
  ROUND_SECONDS,
  WIN_POINTS,
  playerKey,
  scoreRound,
  type PlayerEntry,
  type RoundRecord,
} from '../lib/scoring'
import { isMuted, setMuted, sfx } from '../lib/sound'

type Phase = 'setup' | 'handoff' | 'entry' | 'reveal'
type Mode = 'clasico' | 'experto'
type Variant = 'local' | 'online'

const VARIANT_KEY = 'planta-iot-duelo/variante'

interface Props {
  active: boolean
  onRecord: (r: RoundRecord) => void
  onScoreboard: () => void
}

function pickExpert(previous: Scenario): Scenario {
  const pool = EXPERT_SCENARIOS.filter((s) => s.id !== previous.id)
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function DuelView({ active, onRecord, onScoreboard }: Props) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [names, setNames] = useState<string[]>(['', ''])
  const [mode, setMode] = useState<Mode>('clasico')
  const [scenario, setScenario] = useState<Scenario>(BASE_SCENARIO)
  const [turn, setTurn] = useState(0)
  const [entries, setEntries] = useState<PlayerEntry[]>([])
  const [value, setValue] = useState('')
  const [record, setRecord] = useState<RoundRecord | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [muted, setMutedState] = useState(isMuted)
  const [variant, setVariant] = useState<Variant>(() => {
    try {
      return localStorage.getItem(VARIANT_KEY) === 'online' ? 'online' : 'local'
    } catch {
      return 'local'
    }
  })

  const players = names.map((n) => n.trim())
  const keys = players.map(playerKey)
  const duplicate = new Set(keys).size !== keys.length
  const canStart = players.every((n) => n.length > 0) && !duplicate

  function startRound() {
    const next = mode === 'clasico' ? BASE_SCENARIO : pickExpert(scenario)
    setScenario(next)
    setEntries([])
    setTurn(0)
    setValue('')
    setRecord(null)
    // El reloj de 4 minutos corre por pareja: la revancha no lo reinicia.
    setStartedAt((t) => t ?? Date.now())
    setPhase('handoff')
    sfx.confirm()
  }

  function confirmEntry() {
    if (!isValidEntry(value, MAX_MAINTENANCES)) return
    const next = [...entries, { name: players[turn], x: Number(value) }]
    setEntries(next)
    setValue('')
    sfx.confirm()
    if (next.length === players.length) {
      const r = scoreRound(next, scenario)
      onRecord(r)
      setRecord(r)
      setPhase('reveal')
    } else {
      setTurn(turn + 1)
      setPhase('handoff')
    }
  }

  function newPlayers() {
    setNames(names.map(() => ''))
    setRecord(null)
    setStartedAt(null)
    setPhase('setup')
  }

  function cancelRound() {
    if (!window.confirm('¿Cancelar la ronda actual? No se guardará ningún punto.')) return
    setEntries([])
    setValue('')
    setPhase('setup')
  }

  function setCount(n: number) {
    setNames((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? ''))
  }

  function chooseVariant(v: Variant) {
    if (v === variant) return
    if (variant === 'local' && (phase === 'handoff' || phase === 'entry')) {
      if (!window.confirm('Hay una ronda en curso en este dispositivo. ¿Cambiar de modo y cancelarla?')) return
      setEntries([])
      setValue('')
      setPhase('setup')
    }
    setVariant(v)
    try {
      localStorage.setItem(VARIANT_KEY, v)
    } catch {
      /* ignorar */
    }
  }

  const toggleMute = () => {
    setMuted(!muted)
    setMutedState(!muted)
  }

  const color = PLAYER_COLORS[turn % PLAYER_COLORS.length]

  return (
    <div className="space-y-6">
      {/* Barra superior del duelo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-hazard">Duelo competitivo</div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Gerentes de Planta en Crisis</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-ink-600 p-0.5" role="group" aria-label="Forma de jugar">
            {(
              [
                ['local', '🖥 Un dispositivo'],
                ['online', '📱 En línea (celulares)'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => chooseVariant(v)}
                aria-pressed={variant === v}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  variant === v ? 'bg-hazard text-ink-950' : 'text-ink-300 hover:text-ink-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {variant === 'local' && startedAt !== null && phase !== 'setup' && <RoundTimer startedAt={startedAt} />}
          <button
            type="button"
            onClick={toggleMute}
            className="cursor-pointer rounded-lg border border-ink-600 px-3 py-2 font-mono text-xs text-ink-300 hover:border-ink-400"
            aria-pressed={!muted}
          >
            {muted ? '🔇 Sonido' : '🔊 Sonido'}
          </button>
          {variant === 'local' && (phase === 'handoff' || phase === 'entry') && (
            <button
              type="button"
              onClick={cancelRound}
              className="cursor-pointer rounded-lg border border-ink-600 px-3 py-2 font-mono text-xs text-ink-300 hover:border-alarm hover:text-alarm"
            >
              Cancelar ronda
            </button>
          )}
        </div>
      </div>

      {variant === 'online' && <HostRoom onRecord={onRecord} onScoreboard={onScoreboard} />}

      {variant === 'local' && phase === 'setup' && (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <section className="panel animate-rise p-6">
            <h2 className="text-xl font-bold">1 · ¿Quiénes compiten?</h2>
            <div className="mt-4 flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={`cursor-pointer rounded-lg border px-4 py-2 font-mono text-sm ${
                    names.length === n
                      ? 'border-hazard bg-hazard/10 text-hazard'
                      : 'border-ink-600 text-ink-300 hover:border-ink-400'
                  }`}
                >
                  {n} gerentes
                </button>
              ))}
            </div>

            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (canStart) startRound()
              }}
            >
              {names.map((n, i) => (
                <label key={i} className="flex items-center gap-3">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-xl font-mono font-bold text-ink-950"
                    style={{ background: PLAYER_COLORS[i] }}
                  >
                    G{i + 1}
                  </span>
                  <input
                    value={n}
                    maxLength={24}
                    onChange={(e) => setNames((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
                    placeholder={`Nombre del gerente ${i + 1}`}
                    className="h-11 w-full rounded-xl border border-ink-600 bg-ink-950 px-4 text-lg text-ink-100 outline-none placeholder:text-ink-500 focus:border-hazard"
                    autoComplete="off"
                  />
                </label>
              ))}
              {duplicate && <p className="text-sm text-alarm">Los nombres deben ser distintos para llevar el marcador.</p>}

              <h2 className="pt-4 text-xl font-bold">2 · Elige la planta</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <ModeCard
                  selected={mode === 'clasico'}
                  onClick={() => setMode('clasico')}
                  title="Clásico"
                  badge="Modelo oficial"
                  text="La planta IoT del proyecto. Ideal para quienes acaban de escuchar la explicación."
                />
                <ModeCard
                  selected={mode === 'experto'}
                  onClick={() => setMode('experto')}
                  title="Experto"
                  badge="Planta sorpresa"
                  text="Otra fábrica con otros parámetros a, b, c. Solo la derivada te salva."
                />
              </div>

              <Button type="submit" disabled={!canStart} className="mt-4 w-full py-4 text-base">
                Iniciar ronda ▶
              </Button>
            </form>
          </section>

          <aside className="panel space-y-4 p-6 text-ink-300">
            <h2 className="text-xl font-bold text-ink-100">Reglas (4 min)</h2>
            <ol className="list-inside list-decimal space-y-2">
              <li>
                Cada gerente recibe <b className="text-ok">{usd(BASE_SCENARIO.budget)} USD</b> de presupuesto mensual.
              </li>
              <li>
                Por turnos y <b className="text-ink-100">en secreto</b>, decide cuántos mantenimientos preventivos x hará
                este mes (de 0 a {MAX_MAINTENANCES}, se permiten decimales).
              </li>
              <li>
                El sistema evalúa <FormulaG s={BASE_SCENARIO} /> y descuenta el gasto.
              </li>
              <li>Gana quien conserve más presupuesto.</li>
            </ol>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-hazard/40 bg-hazard/5 p-3">
                <div className="font-mono text-2xl font-bold text-hazard">+{WIN_POINTS}</div>
                <div className="text-sm">por ganar la ronda</div>
              </div>
              <div className="rounded-xl border border-ok/40 bg-ok/5 p-3">
                <div className="font-mono text-2xl font-bold text-ok">+{BONUS_POINTS}</div>
                <div className="text-sm">bono si quedas a ±{BONUS_TOLERANCE} del óptimo</div>
              </div>
            </div>
            <p className="text-sm text-ink-400">
              Pista: el gasto mínimo está donde la pendiente G′(x) se hace cero. ¿Pocos mantenimientos? Fallas carísimas.
              ¿Demasiados? Técnicos carísimos.
            </p>
          </aside>
        </div>
      )}

      {variant === 'local' && phase === 'handoff' && (
        <section className="panel grid min-h-[460px] animate-rise place-items-center p-8 text-center">
          <div>
            <Progress players={players} done={entries.length} />
            <div className="mt-8 font-mono text-sm uppercase tracking-[0.25em] text-ink-400">Turno de</div>
            <div className="mt-2 text-5xl font-bold sm:text-7xl" style={{ color }}>
              {players[turn]}
            </div>
            <p className="mx-auto mt-5 max-w-md text-lg text-ink-300">
              Los demás gerentes: <b className="text-ink-100">¡miren hacia otro lado!</b> 👀
            </p>
            <Button className="mt-8 px-8 py-4 text-base" onClick={() => setPhase('entry')}>
              Soy {players[turn]}, estoy listo
            </Button>
          </div>
        </section>
      )}

      {variant === 'local' && phase === 'entry' && (
        <section className="grid animate-rise gap-5 lg:grid-cols-[1fr_420px]">
          <div className="panel flex flex-col justify-between gap-6 p-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Tag>
                  <span className="size-2 rounded-full" style={{ background: color }} /> {players[turn]}
                </Tag>
                <Tag>{scenario.name}</Tag>
              </div>
              <h2 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">
                ¿Cuántos mantenimientos preventivos programarás este mes?
              </h2>
              <p className="mt-3 text-ink-300">{scenario.tagline}.</p>
            </div>

            <div className="rounded-xl border border-ink-700 bg-ink-950/60 p-5">
              <div className="font-mono text-xs uppercase tracking-[0.16em] text-ink-400">Gasto mensual (cientos USD)</div>
              <div className="mt-2 text-xl sm:text-2xl">
                <FormulaG s={scenario} />
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <Info label="Presupuesto" value={usd(scenario.budget)} />
                <Info label="Rango válido" value={`0 – ${MAX_MAINTENANCES}`} />
                <Info label="Decimales" value="hasta 2" />
              </div>
            </div>

            <Progress players={players} done={entries.length} />
          </div>

          <div className="panel p-5">
            <Keypad
              value={value}
              setValue={setValue}
              onSubmit={confirmEntry}
              max={MAX_MAINTENANCES}
              active={active && variant === 'local' && phase === 'entry'}
              accent={color}
            />
          </div>
        </section>
      )}

      {variant === 'local' && phase === 'reveal' && record && (
        <RoundReveal
          record={record}
          scenario={scenario}
          onRematch={startRound}
          onNewPlayers={newPlayers}
          onScoreboard={onScoreboard}
        />
      )}
    </div>
  )
}

function ModeCard({
  selected,
  onClick,
  title,
  badge,
  text,
}: {
  selected: boolean
  onClick: () => void
  title: string
  badge: string
  text: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`cursor-pointer rounded-xl border p-4 text-left transition ${
        selected ? 'border-hazard bg-hazard/10' : 'border-ink-600 hover:border-ink-400'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-lg font-bold ${selected ? 'text-hazard' : 'text-ink-100'}`}>{title}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">{badge}</span>
      </div>
      <p className="mt-1 text-sm text-ink-300">{text}</p>
    </button>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-400">{label}</div>
      <div className="font-mono font-semibold text-ink-100">{value}</div>
    </div>
  )
}

function Progress({ players, done }: { players: string[]; done: number }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {players.map((p, i) => (
        <span
          key={p + i}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs ${
            i < done ? 'border-ok/50 text-ok' : i === done ? 'border-ink-400 text-ink-100' : 'border-ink-700 text-ink-500'
          }`}
        >
          <span className="size-2 rounded-full" style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
          {p} {i < done ? '✓ decidió' : i === done ? '· decidiendo' : '· en espera'}
        </span>
      ))}
    </div>
  )
}

function RoundTimer({ startedAt }: { startedAt: number }) {
  const now = useNow(250)
  const remaining = ROUND_SECONDS * 1000 - (now - startedAt)
  const over = remaining <= 0
  const warn = remaining < 30_000
  return (
    <div
      className={`tabular rounded-lg border px-3 py-2 font-mono text-sm font-semibold ${
        over ? 'border-alarm bg-alarm/10 text-alarm' : warn ? 'border-hazard text-hazard' : 'border-ink-600 text-ink-200'
      }`}
      title="Tiempo del turno de esta pareja (4 minutos)"
    >
      ⏱ {over ? 'Tiempo agotado' : mmss(remaining)}
    </div>
  )
}
