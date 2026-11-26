import { useEffect } from 'react'
import { Chart } from './Chart'
import { Eq, Frac, FormulaG } from './MathText'
import { Button, PLAYER_COLORS } from './ui'
import { easeOutCubic, useProgress } from '../lib/hooks'
import { num, qty, usd } from '../lib/format'
import { type Scenario, G, criticalRhs, toUSD } from '../lib/model'
import {
  BONUS_POINTS,
  SOLO_TIERS,
  WIN_POINTS,
  maxBudgetLeft,
  soloEfficiency,
  soloTier,
  type RoundRecord,
} from '../lib/scoring'
import { sfx } from '../lib/sound'
import { verdict } from '../lib/verdict'

interface Props {
  record: RoundRecord
  scenario: Scenario
  onRematch: () => void
  onNewPlayers: () => void
  onScoreboard: () => void
}

const REVEAL_MS = 2800

export function RoundReveal({ record, scenario: s, onRematch, onNewPlayers, onScoreboard }: Props) {
  const p = useProgress(REVEAL_MS, record.id)
  const e = easeOutCubic(p)
  const done = p >= 1
  const xOpt = record.optimum
  const winners = record.players.filter((pl) => pl.winner)
  const someoneBroke = record.players.some((pl) => pl.left < 0)
  const solo = record.solo === true && record.players.length === 1
  const soloPlayer = record.players[0]
  const tier = soloTier(soloPlayer.x, xOpt)
  const celebrate = solo ? tier.passed : true

  useEffect(() => {
    if (!done) return
    if (celebrate) sfx.win()
    if (someoneBroke || !celebrate) window.setTimeout(sfx.alarm, 700)
  }, [done, someoneBroke, celebrate])

  const xMax = Math.max(15, Math.ceil(Math.max(...record.players.map((pl) => pl.x)) + 1))
  const yTop = Math.max(G(0, s), ...record.players.map((pl) => pl.cost)) * 1.06

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div
        className={`panel relative overflow-hidden px-6 py-6 text-center transition-colors duration-500 ${done ? 'border-hazard' : ''}`}
      >
        {done && solo ? (
          <div className="animate-pop">
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-hazard">
              Reto en solitario · {tier.passed ? 'reto superado' : 'reto no superado'}
            </div>
            <div className="mt-2 text-3xl font-bold sm:text-5xl">
              {tier.emoji} {tier.label}
            </div>
            <div className="mt-2 text-ink-300">
              {soloPlayer.name} conserva <b className={soloPlayer.left < 0 ? 'text-alarm' : 'text-ok'}>{usd(soloPlayer.left)}</b>{' '}
              de un máximo posible de <b className="text-ok">{usd(maxBudgetLeft(s))}</b>
            </div>
          </div>
        ) : done ? (
          <div className="animate-pop">
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-hazard">
              {winners.length > 1 ? 'Empate técnico' : 'Gerente ganador'}
            </div>
            <div className="mt-2 text-3xl font-bold sm:text-5xl">
              🏆 {winners.map((w) => w.name).join(' y ')}
            </div>
            <div className="mt-2 text-ink-300">
              Conserva <b className="text-ok">{usd(winners[0].left)}</b> de {usd(s.budget)} con x = {qty(winners[0].x)}{' '}
              mantenimientos
            </div>
          </div>
        ) : (
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-ink-400">Sensores IoT procesando…</div>
            <div className="mt-2 text-3xl font-bold sm:text-4xl">
              Calculando G(x) del mes<span className="animate-blink">_</span>
            </div>
          </div>
        )}
      </div>

      {/* Tarjetas por jugador */}
      <div className={`grid gap-4 ${record.players.length > 2 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2'}`}>
        {record.players.map((pl, i) => {
          const color = PLAYER_COLORS[i % PLAYER_COLORS.length]
          const spent = toUSD(pl.cost) * e
          const left = s.budget - spent
          const frac = Math.max(0, Math.min(1, left / s.budget))
          const broke = left < 0
          const v = verdict(pl, xOpt)
          return (
            <article
              key={pl.name + i}
              className={`panel relative overflow-hidden p-5 transition ${done && pl.winner ? 'ring-2 ring-hazard' : ''}`}
            >
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
              <header className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-bold" style={{ color }}>
                    {pl.name}
                  </div>
                  <div className="font-mono text-sm text-ink-400">x = {qty(pl.x)} mantenimientos</div>
                </div>
                {done && (
                  <div className="animate-pop text-right">
                    <div className="font-mono text-3xl font-bold text-hazard">+{pl.points}</div>
                    <div className="text-[11px] uppercase tracking-wider text-ink-400">puntos</div>
                  </div>
                )}
              </header>

              <dl className="tabular mt-4 space-y-1.5 font-mono text-sm">
                <div className="flex justify-between">
                  <dt className="text-fail">Fallas graves</dt>
                  <dd>{usd(toUSD(pl.failure) * e)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ops">Gasto operativo</dt>
                  <dd>{usd(toUSD(pl.operating) * e)}</dd>
                </div>
                <div className="flex justify-between border-t border-ink-700 pt-1.5 font-semibold">
                  <dt>Gasto total G(x)</dt>
                  <dd>{usd(spent)}</dd>
                </div>
              </dl>

              <div className="mt-4">
                <div className="mb-1 flex justify-between font-mono text-xs text-ink-400">
                  <span>Presupuesto restante</span>
                  <span className={`tabular font-semibold ${broke ? 'text-alarm' : 'text-ok'}`}>{usd(left)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${frac * 100}%`, background: broke ? 'var(--color-alarm)' : color }}
                  />
                </div>
              </div>

              {done && (
                <div className="mt-4 animate-rise rounded-lg bg-ink-950/60 p-3 text-sm">
                  {broke && (
                    <div className="mb-1 font-mono text-xs font-bold uppercase tracking-widest text-alarm">
                      ⚠ Quiebra: superaste el presupuesto
                    </div>
                  )}
                  <div className={`font-bold ${v.cls}`}>{v.title}</div>
                  <div className="text-ink-300">{v.text}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px]">
                    {solo && (
                      <span className="rounded bg-hazard/15 px-2 py-0.5 text-hazard">
                        {tier.emoji} {tier.label} +{tier.points}
                      </span>
                    )}
                    {!solo && pl.winner && (
                      <span className="rounded bg-hazard/15 px-2 py-0.5 text-hazard">Victoria +{WIN_POINTS}</span>
                    )}
                    {!solo && pl.bonus && (
                      <span className="rounded bg-ok/15 px-2 py-0.5 text-ok">Bono precisión +{BONUS_POINTS}</span>
                    )}
                  </div>
                </div>
              )}
            </article>
          )
        })}

        {solo && <SoloScore x={soloPlayer.x} xOpt={xOpt} scenario={s} progress={e} done={done} />}
      </div>

      {/* Gráfica y solución */}
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="panel p-4 sm:p-6">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-bold">{solo ? '¿Qué tan cerca quedaste del óptimo?' : '¿Dónde cayó cada gerente?'}</h3>
            <span className="font-mono text-sm text-ink-400">
              <FormulaG s={s} />
            </span>
          </div>
          <Chart
            ariaLabel="Curva de gasto con la decisión de cada jugador"
            xMin={0}
            xMax={xMax}
            yMin={0}
            yMax={yTop}
            height={340}
            xLabel="x · mantenimientos al mes"
            yLabel="cientos de USD"
            showLegend={false}
            curves={[{ f: (t: number) => G(t, s), color: 'var(--color-ink-300)', width: 3 }]}
            vLines={done ? [{ x: xOpt, color: 'var(--color-ok)', label: `óptimo x* ≈ ${num(xOpt, 2)}` }] : []}
            markers={[
              ...record.players.map((pl, i) => ({
                x: pl.x,
                y: G(pl.x, s),
                color: PLAYER_COLORS[i % PLAYER_COLORS.length],
                label: pl.name,
                ring: done && pl.winner,
                size: 8,
              })),
              ...(done ? [{ x: xOpt, y: G(xOpt, s), color: 'var(--color-ok)', size: 6 }] : []),
            ]}
          />
        </div>

        <div className="panel space-y-3 p-5 text-sm text-ink-300">
          <h3 className="text-base font-bold text-ink-100">La respuesta de la derivada</h3>
          <Eq>
            G′(x) = −{num(s.a * s.b, 0)}e<sup>−{s.b}x</sup> + <Frac n={s.c} d="x + 1" /> = 0
          </Eq>
          <Eq>
            (x + 1)e<sup>−{s.b}x</sup> = {num(criticalRhs(s), 3)}
            <br />⟹ <span className="text-hazard">x* ≈ {num(xOpt, 2)}</span>
          </Eq>
          <p>
            Gasto mínimo posible: <b className="text-ok">{usd(toUSD(G(xOpt, s)))}</b>, conservando{' '}
            <b className="text-ok">{usd(s.budget - toUSD(G(xOpt, s)))}</b>. Con G″(x*) &gt; 0 confirmamos que es un
            mínimo.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={onRematch} disabled={!done}>
          {solo ? '↻ Intentar de nuevo' : '↻ Revancha (mismos gerentes)'}
        </Button>
        <Button variant="ghost" onClick={onNewPlayers} disabled={!done}>
          {solo ? 'Siguiente jugador' : 'Siguiente pareja'}
        </Button>
        <Button variant="ghost" onClick={onScoreboard}>
          Ver marcador
        </Button>
      </div>
    </div>
  )
}

/** Panel del reto en solitario: eficiencia frente al óptimo y escala de medallas. */
function SoloScore({
  x,
  xOpt,
  scenario,
  progress,
  done,
}: {
  x: number
  xOpt: number
  scenario: Scenario
  progress: number
  done: boolean
}) {
  const eff = soloEfficiency(x, scenario)
  const shown = Math.max(0, eff) * progress
  const current = soloTier(x, xOpt)
  const err = Math.abs(x - xOpt)

  return (
    <article className="panel flex flex-col gap-4 p-5">
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-ink-400">Eficiencia del gerente</div>
        <div className="tabular mt-1 font-mono text-5xl font-bold text-hazard">{Math.round(shown * 100)}%</div>
        <div className="text-sm text-ink-400">del ahorro máximo posible frente a no hacer mantenimientos</div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-ink-800">
          <div className="h-full rounded-full bg-hazard" style={{ width: `${Math.min(1, shown) * 100}%` }} />
        </div>
      </div>

      <div>
        <div className="mb-2 font-mono text-xs uppercase tracking-[0.16em] text-ink-400">
          Distancia al óptimo: ±{num(err, 2)}
        </div>
        <ul className="space-y-1.5 text-sm">
          {SOLO_TIERS.map((t) => {
            const active = done && t.id === current.id
            return (
              <li
                key={t.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-1.5 transition ${
                  active ? 'border-hazard bg-hazard/10 text-ink-100' : 'border-ink-700 text-ink-400'
                }`}
              >
                <span>
                  {t.emoji} {t.label}
                </span>
                <span className="font-mono text-xs">
                  {Number.isFinite(t.maxError) ? `±${t.maxError}` : 'más lejos'} · +{t.points}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </article>
  )
}
