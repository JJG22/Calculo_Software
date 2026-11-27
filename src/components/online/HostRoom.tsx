import { useEffect, useRef, useState } from 'react'
import { Icon } from '../Icon'
import QRCode from 'qrcode'
import { FormulaG } from '../MathText'
import { RoundReveal } from '../RoundReveal'
import { Button, PLAYER_COLORS, Tag } from '../ui'
import { getScenario } from '../../lib/model'
import { getClientId, joinUrl, useRoomConnection } from '../../lib/online'
import { MAX_ONLINE_PLAYERS, MIN_ONLINE_PLAYERS, type OnlineMode } from '../../lib/protocol'
import type { RoundRecord } from '../../lib/scoring'
import { sfx } from '../../lib/sound'

const HOST_ROOM_KEY = 'planta-iot-duelo/host-room'

const readStoredCode = () => {
  try {
    return sessionStorage.getItem(HOST_ROOM_KEY)
  } catch {
    return null
  }
}
const storeCode = (code: string | null) => {
  try {
    if (code) sessionStorage.setItem(HOST_ROOM_KEY, code)
    else sessionStorage.removeItem(HOST_ROOM_KEY)
  } catch {
    /* ignorar */
  }
}

interface Props {
  onRecord: (r: RoundRecord) => void
  onScoreboard: () => void
}

export function HostRoom({ onRecord, onScoreboard }: Props) {
  const clientId = getClientId()
  const [initialMode, setInitialMode] = useState<OnlineMode>('clasico')

  const conn = useRoomConnection(true, () => {
    const code = readStoredCode()
    return code ? { t: 'host:resume', clientId, code } : { t: 'host:create', clientId, mode: initialMode }
  })
  const { room, error, send, status, clearError } = conn

  // Guarda el código para recuperar la sala si se recarga la página
  useEffect(() => {
    if (room) storeCode(room.code)
  }, [room])

  // La sala ya no existe (p. ej. el servidor se reinició): crea una nueva
  useEffect(() => {
    if (error?.code === 'room_not_found' && !room) {
      storeCode(null)
      clearError()
      send({ t: 'host:create', clientId, mode: initialMode })
    }
  }, [error, room, send, clearError, clientId, initialMode])

  // Guarda el resultado en el marcador del stand
  useEffect(() => {
    if (room?.phase === 'reveal' && room.record) onRecord(room.record)
  }, [room, onRecord])

  // Sonido cuando alguien entra
  const playerCount = room?.players.length ?? 0
  const prevCount = useRef(playerCount)
  useEffect(() => {
    if (playerCount > prevCount.current) sfx.confirm()
    prevCount.current = playerCount
  }, [playerCount])

  if (!room) {
    return (
      <div className="panel grid min-h-[420px] place-items-center p-10 text-center">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-ink-400">
            {status === 'open' ? 'Creando sala…' : 'Conectando con el servidor…'}
          </div>
          <div className="mt-3 text-2xl font-bold">
            Preparando la sala en línea<span className="animate-blink">_</span>
          </div>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-400">
            Si tarda más de un minuto, el servidor gratuito de Render se está despertando. Espera un momento.
          </p>
        </div>
      </div>
    )
  }

  const scenario = getScenario(room.scenarioId)
  const mode = room.mode
  const enough = room.players.length >= MIN_ONLINE_PLAYERS

  const setMode = (m: OnlineMode) => {
    setInitialMode(m)
    send({ t: 'host:mode', mode: m })
  }

  return (
    <div className="space-y-5">
      {status !== 'open' && (
        <div className="rounded-xl border border-hazard/50 bg-hazard/10 px-4 py-2 text-sm text-hazard">
          Conexión perdida con el servidor. Reconectando… (los jugadores no pierden su puesto)
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-alarm/50 bg-alarm/10 px-4 py-2 text-sm text-alarm">{error.message}</div>
      )}

      {room.phase === 'lobby' && (
        <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
          <JoinCard code={room.code} />

          <section className="panel flex flex-col gap-5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold">Gerentes conectados</h2>
              <Tag>
                {room.players.length}/{MAX_ONLINE_PLAYERS}
              </Tag>
            </div>

            <ul className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: Math.max(2, room.players.length) }, (_, i) => {
                const p = room.players[i]
                const color = PLAYER_COLORS[i % PLAYER_COLORS.length]
                return (
                  <li
                    key={p?.id ?? `empty-${i}`}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                      p ? 'animate-pop border-ink-600 bg-ink-800' : 'border-dashed border-ink-700'
                    }`}
                  >
                    <span className="size-3 shrink-0 rounded-full" style={{ background: p ? color : 'var(--color-ink-700)' }} />
                    {p ? (
                      <>
                        <span className="min-w-0 flex-1 truncate text-lg font-bold" style={{ color }}>
                          {p.name}
                        </span>
                        {!p.connected && <span className="font-mono text-xs text-hazard">sin señal</span>}
                        <KickButton onClick={() => send({ t: 'host:kick', playerId: p.id })} name={p.name} />
                      </>
                    ) : (
                      <span className="text-ink-500">Esperando gerente…</span>
                    )}
                  </li>
                )
              })}
            </ul>

            <div>
              <div className="mb-2 text-sm font-semibold text-ink-300">Planta</div>
              <div className="flex gap-2">
                {(['clasico', 'experto'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold ${
                      mode === m ? 'border-hazard bg-hazard/10 text-hazard' : 'border-ink-600 text-ink-300 hover:border-ink-400'
                    }`}
                  >
                    {m === 'clasico' ? 'Clásico · modelo oficial' : 'Experto · planta sorpresa'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto flex flex-wrap gap-3">
              <Button className="flex-1 py-4 text-base" disabled={!enough} onClick={() => send({ t: 'host:start' })}>
                {!enough
                  ? 'Esperando gerentes…'
                  : room.players.length === 1
                    ? 'Iniciar reto solo'
                    : 'Iniciar duelo'}
                {enough && <Icon name="arrow-right" className="size-5" />}
              </Button>
              {room.players.length > 0 && (
                <Button variant="ghost" onClick={() => send({ t: 'host:newPair' })}>
                  Vaciar sala
                </Button>
              )}
            </div>
          </section>
        </div>
      )}

      {room.phase === 'deciding' && (
        <section className="panel animate-rise p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Tag>Ronda {room.round}</Tag>
              <Tag>{scenario.name}</Tag>
              <Tag>Sala {room.code}</Tag>
            </div>
            <div className="text-lg">
              <FormulaG s={scenario} />
            </div>
          </div>

          <h2 className="mt-8 text-center text-3xl font-bold sm:text-5xl">Los gerentes deciden en su celular…</h2>
          <p className="mt-3 text-center text-ink-300">
            ¿Cuántos mantenimientos preventivos harán este mes? Nadie ve la decisión de los demás.
          </p>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
            {room.players.map((p, i) => {
              const color = PLAYER_COLORS[i % PLAYER_COLORS.length]
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border-2 p-6 text-center transition ${p.submitted ? '' : 'border-ink-700'}`}
                  style={p.submitted ? { borderColor: color } : undefined}
                >
                  <div className="text-2xl font-bold" style={{ color }}>
                    {p.name}
                  </div>
                  <div className="mt-3 font-mono text-lg">
                    {p.submitted ? (
                      <span className="animate-pop inline-flex items-center gap-2 text-ok">
                        <Icon name="check" className="size-5" /> Decisión enviada
                      </span>
                    ) : p.connected ? (
                      <span className="text-ink-400">
                        pensando<span className="animate-blink">…</span>
                      </span>
                    ) : (
                      <span className="text-hazard">sin señal — esperando reconexión</span>
                    )}
                  </div>
                  {!p.submitted && (
                    <div className="mt-3">
                      <KickButton onClick={() => send({ t: 'host:kick', playerId: p.id })} name={p.name} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {room.phase === 'reveal' && room.record && (
        <RoundReveal
          record={room.record}
          scenario={scenario}
          onRematch={() => send({ t: 'host:start' })}
          onNewPlayers={() => send({ t: 'host:newPair' })}
          onScoreboard={onScoreboard}
        />
      )}
    </div>
  )
}

function KickButton({ onClick, name }: { onClick: () => void; name: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm(`¿Sacar a ${name} de la sala?`)) onClick()
      }}
      className="cursor-pointer rounded-md border border-ink-600 px-2 py-0.5 font-mono text-xs text-ink-400 hover:border-alarm hover:text-alarm"
      title={`Sacar a ${name}`}
    >
      sacar
    </button>
  )
}

function JoinCard({ code }: { code: string }) {
  const url = joinUrl(code)
  const [qr, setQr] = useState<string | null>(null)
  const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, { margin: 1, width: 560, color: { dark: '#07090b', light: '#ffffff' } })
      .then((data) => {
        if (!cancelled) setQr(data)
      })
      .catch(() => setQr(null))
    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <section className="panel flex flex-col items-center p-6 text-center lg:w-[360px]">
      <div className="font-mono text-xs uppercase tracking-[0.25em] text-hazard">Escanea para jugar</div>
      <div className="mt-4 rounded-2xl bg-white p-3">
        {qr ? (
          <img src={qr} alt={`Código QR para entrar a la sala ${code}`} className="size-60" />
        ) : (
          <div className="size-60" />
        )}
      </div>
      <div className="mt-5 text-sm text-ink-400">o entra a la página y escribe el código</div>
      <div className="mt-1 font-mono text-6xl font-bold tracking-[0.2em] text-hazard">{code}</div>
      <div className="mt-3 break-all font-mono text-xs text-ink-500">{url}</div>
      {isLocalhost && (
        <p className="mt-4 rounded-lg border border-hazard/40 bg-hazard/10 p-3 text-left text-xs text-hazard">
          Estás en <b>localhost</b>: los celulares no pueden abrir esa dirección. Abre la app con la dirección de red que
          muestra la terminal (por ejemplo http://192.168.1.20:5173) o usa la versión publicada en Render.
        </p>
      )}
    </section>
  )
}
