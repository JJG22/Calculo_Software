import { Button, PLAYER_COLORS, SectionTitle } from '../components/ui'
import { num, qty, usd } from '../lib/format'
import { getScenario, toUSD } from '../lib/model'
import { historyToCSV, standings, type RoundRecord } from '../lib/scoring'

interface Props {
  history: RoundRecord[]
  removeLast: () => void
  clear: () => void
  onDuel: () => void
}

const MEDALS = ['🥇', '🥈', '🥉']

function downloadCSV(history: RoundRecord[]) {
  // BOM para que Excel reconozca tildes y ñ
  const blob = new Blob(['﻿' + historyToCSV(history)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `marcador-planta-iot-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function ScoreboardView({ history, removeLast, clear, onDuel }: Props) {
  const table = standings(history)
  const podium = table.slice(0, 3)

  if (history.length === 0) {
    return (
      <div className="panel grid min-h-[420px] place-items-center p-10 text-center">
        <div>
          <div className="text-6xl">🏭</div>
          <h1 className="mt-4 text-3xl font-bold">Aún no hay rondas jugadas</h1>
          <p className="mt-2 text-ink-300">El marcador se llena solo al terminar cada duelo y se guarda en este navegador.</p>
          <Button className="mt-6" onClick={onDuel}>
            Ir al duelo ▶
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle kicker="Marcador del stand" title="Ranking de gerentes">
          {history.length} {history.length === 1 ? 'ronda jugada' : 'rondas jugadas'} · {table.length} gerentes
        </SectionTitle>
        <div className="mb-6 flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => downloadCSV(history)}>
            ⬇ Exportar CSV
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (window.confirm('¿Deshacer la última ronda? Se restarán sus puntos.')) removeLast()
            }}
          >
            ↶ Deshacer última ronda
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm('¿Borrar TODO el marcador? Esta acción no se puede deshacer.')) clear()
            }}
          >
            Reiniciar marcador
          </Button>
        </div>
      </div>

      {/* Podio */}
      <div className="grid gap-4 md:grid-cols-3">
        {podium.map((p, i) => (
          <div
            key={p.key}
            className={`panel animate-rise p-6 ${i === 0 ? 'border-hazard md:order-2 md:-translate-y-3' : i === 1 ? 'md:order-1' : 'md:order-3'}`}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-4xl">{MEDALS[i]}</span>
              <span className="tabular font-mono text-4xl font-bold text-hazard">{p.points}</span>
            </div>
            <div className="mt-3 truncate text-2xl font-bold">{p.name}</div>
            <div className="mt-1 font-mono text-xs text-ink-400">
              {p.wins} victorias · {p.bonuses} bonos · mejor error ±{num(p.bestError, 2)}
            </div>
          </div>
        ))}
      </div>

      {/* Tabla completa */}
      <div className="panel overflow-x-auto">
        <table className="tabular w-full min-w-[640px] text-left">
          <thead className="font-mono text-xs uppercase tracking-wider text-ink-400">
            <tr className="border-b border-ink-700">
              <th className="px-5 py-3">#</th>
              <th className="px-5 py-3">Gerente</th>
              <th className="px-5 py-3 text-right">Puntos</th>
              <th className="px-5 py-3 text-right">Rondas</th>
              <th className="px-5 py-3 text-right">Victorias</th>
              <th className="px-5 py-3 text-right">Bonos</th>
              <th className="px-5 py-3 text-right">Mejor presupuesto</th>
              <th className="px-5 py-3 text-right">Distancia a x*</th>
            </tr>
          </thead>
          <tbody>
            {table.map((p, i) => (
              <tr key={p.key} className="border-b border-ink-800 last:border-0 hover:bg-ink-800/50">
                <td className="px-5 py-3 font-mono text-ink-400">{i + 1}</td>
                <td className="px-5 py-3 font-semibold">{p.name}</td>
                <td className="px-5 py-3 text-right font-mono text-lg font-bold text-hazard">{p.points}</td>
                <td className="px-5 py-3 text-right font-mono">{p.rounds}</td>
                <td className="px-5 py-3 text-right font-mono">{p.wins}</td>
                <td className="px-5 py-3 text-right font-mono text-ok">{p.bonuses}</td>
                <td className={`px-5 py-3 text-right font-mono ${p.bestLeft < 0 ? 'text-alarm' : ''}`}>{usd(p.bestLeft)}</td>
                <td className="px-5 py-3 text-right font-mono text-ink-300">±{num(p.bestError, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Historial */}
      <section>
        <h2 className="mb-4 text-xl font-bold">Historial de rondas</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[...history]
            .map((r, i) => ({ r, n: i + 1 }))
            .reverse()
            .map(({ r, n }) => (
              <article key={r.id} className="panel p-4">
                <header className="mb-3 flex items-baseline justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-hazard">Ronda {n}</span>
                  <span className="truncate font-mono text-xs text-ink-400">
                    {getScenario(r.scenarioId).name} ·{' '}
                    {new Date(r.at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </header>
                <ul className="space-y-1.5">
                  {r.players.map((p, i) => (
                    <li key={p.name + i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="size-2 shrink-0 rounded-full" style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
                        <span className={`truncate ${p.winner ? 'font-bold text-ink-100' : 'text-ink-300'}`}>
                          {p.winner && '🏆 '}
                          {p.name}
                        </span>
                      </span>
                      <span className="tabular shrink-0 font-mono text-xs text-ink-400">
                        x={qty(p.x)} · {usd(toUSD(p.cost))} · <span className="text-hazard">+{p.points}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 border-t border-ink-800 pt-2 font-mono text-[11px] text-ink-500">
                  óptimo de la ronda: x* ≈ {num(r.optimum, 2)}
                </div>
              </article>
            ))}
        </div>
      </section>
    </div>
  )
}
