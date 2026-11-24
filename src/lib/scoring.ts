import {
  type Scenario,
  G,
  budgetLeft,
  dG,
  failureCost,
  getScenario,
  operatingCost,
  optimum,
  toUSD,
} from './model'
import { qty } from './format'

export const WIN_POINTS = 3
export const BONUS_POINTS = 1
/** Distancia máxima al óptimo para ganar el bono de precisión (mantenimientos). */
export const BONUS_TOLERANCE = 0.3
export const MAX_MAINTENANCES = 30
export const ROUND_SECONDS = 4 * 60

export interface PlayerEntry {
  name: string
  x: number
}

export interface PlayerResult extends PlayerEntry {
  /** G(x) en cientos de USD */
  cost: number
  failure: number
  operating: number
  /** USD que conserva del presupuesto */
  left: number
  /** G′(x) */
  slope: number
  winner: boolean
  bonus: boolean
  points: number
}

export interface RoundRecord {
  id: string
  at: number
  scenarioId: string
  optimum: number
  players: PlayerResult[]
}

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function scoreRound(entries: PlayerEntry[], s: Scenario): RoundRecord {
  const xOpt = optimum(s)
  const costs = entries.map((e) => G(e.x, s))
  const best = Math.min(...costs)

  const players: PlayerResult[] = entries.map((e, i) => {
    const cost = costs[i]
    const winner = Math.abs(cost - best) < 1e-9
    const bonus = Math.abs(e.x - xOpt) <= BONUS_TOLERANCE
    return {
      name: e.name,
      x: e.x,
      cost,
      failure: failureCost(e.x, s),
      operating: operatingCost(e.x, s),
      left: budgetLeft(e.x, s),
      slope: dG(e.x, s),
      winner,
      bonus,
      points: (winner ? WIN_POINTS : 0) + (bonus ? BONUS_POINTS : 0),
    }
  })

  return { id: makeId(), at: Date.now(), scenarioId: s.id, optimum: xOpt, players }
}

export interface Standing {
  key: string
  name: string
  rounds: number
  wins: number
  bonuses: number
  points: number
  /** Menor distancia al óptimo lograda */
  bestError: number
  /** Mejor presupuesto conservado (USD) */
  bestLeft: number
}

export const playerKey = (name: string) => name.trim().toLocaleLowerCase('es')

export function standings(history: RoundRecord[]): Standing[] {
  const map = new Map<string, Standing>()
  for (const round of history) {
    for (const p of round.players) {
      const key = playerKey(p.name)
      const st =
        map.get(key) ??
        ({
          key,
          name: p.name.trim(),
          rounds: 0,
          wins: 0,
          bonuses: 0,
          points: 0,
          bestError: Infinity,
          bestLeft: -Infinity,
        } satisfies Standing)
      st.rounds += 1
      st.wins += p.winner ? 1 : 0
      st.bonuses += p.bonus ? 1 : 0
      st.points += p.points
      st.bestError = Math.min(st.bestError, Math.abs(p.x - round.optimum))
      st.bestLeft = Math.max(st.bestLeft, p.left)
      map.set(key, st)
    }
  }
  return [...map.values()].sort(
    (a, b) => b.points - a.points || b.wins - a.wins || a.bestError - b.bestError,
  )
}

const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function historyToCSV(history: RoundRecord[]): string {
  const header = [
    'ronda',
    'fecha',
    'planta',
    'jugador',
    'mantenimientos_x',
    'gasto_usd',
    'presupuesto_restante_usd',
    'derivada_G_prima',
    'ganador',
    'bono_precision',
    'puntos',
  ]
  const rows = history.flatMap((r, i) =>
    r.players.map((p) => [
      i + 1,
      new Date(r.at).toLocaleString('es-CO'),
      getScenario(r.scenarioId).name,
      p.name,
      qty(p.x),
      Math.round(toUSD(p.cost)),
      Math.round(p.left),
      p.slope.toFixed(3),
      p.winner ? 'si' : 'no',
      p.bonus ? 'si' : 'no',
      p.points,
    ]),
  )
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
}
