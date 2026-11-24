import { describe, expect, it } from 'vitest'
import {
  BASE_SCENARIO,
  EXPERT_SCENARIOS,
  G,
  criticalLhs,
  criticalRhs,
  d2G,
  dG,
  newtonSteps,
  optimum,
} from './model'
import { scoreRound, standings, WIN_POINTS, BONUS_POINTS } from './scoring'

describe('modelo oficial G(x) = 200e^(−0.5x) + 40 ln(x+1)', () => {
  const xOpt = optimum(BASE_SCENARIO)

  it('G(0) = 200 (sin mantenimientos solo hay costo de fallas)', () => {
    expect(G(0)).toBeCloseTo(200, 10)
  })

  it('G′(0) = −60', () => {
    expect(dG(0)).toBeCloseTo(-60, 10)
  })

  it('el punto crítico está cerca de 5.6 mantenimientos', () => {
    expect(xOpt).toBeCloseTo(5.61, 1)
    expect(Math.abs(dG(xOpt))).toBeLessThan(1e-9)
  })

  it('cumple (x+1)e^(−0.5x) = 0.4', () => {
    expect(criticalRhs()).toBeCloseTo(0.4, 12)
    expect(criticalLhs(xOpt)).toBeCloseTo(0.4, 9)
  })

  it('la segunda derivada confirma un mínimo', () => {
    expect(d2G(xOpt)).toBeGreaterThan(0)
  })

  it('gasto mínimo ≈ 87.65 cientos de dólares', () => {
    expect(Math.abs(G(xOpt) - 87.645)).toBeLessThan(0.02)
  })

  it('valores del documento: (6)e^(−2.5) ≈ 0.492', () => {
    expect(Math.abs(criticalLhs(5) - 0.492)).toBeLessThan(0.001)
  })

  it('Newton–Raphson converge al mismo óptimo', () => {
    const steps = newtonSteps(5, 6)
    expect(steps.at(-1)!.next).toBeCloseTo(xOpt, 9)
  })
})

describe('escenarios expertos', () => {
  for (const s of EXPERT_SCENARIOS) {
    it(`${s.name}: tiene un mínimo único con G′ = 0 y G″ > 0`, () => {
      expect(s.c).toBeLessThan(s.a * s.b)
      const x = optimum(s)
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(30)
      expect(Math.abs(dG(x, s))).toBeLessThan(1e-9)
      expect(d2G(x, s)).toBeGreaterThan(0)
    })
  }
})

describe('puntuación del duelo', () => {
  it('gana quien conserva más presupuesto', () => {
    const r = scoreRound(
      [
        { name: 'Ana', x: 2 },
        { name: 'Beto', x: 6 },
      ],
      BASE_SCENARIO,
    )
    const [ana, beto] = r.players
    expect(beto.winner).toBe(true)
    expect(ana.winner).toBe(false)
    expect(beto.left).toBeGreaterThan(ana.left)
    expect(beto.points).toBe(WIN_POINTS)
  })

  it('el bono de precisión se suma al acercarse al óptimo', () => {
    const r = scoreRound(
      [
        { name: 'Ana', x: 5.6 },
        { name: 'Beto', x: 10 },
      ],
      BASE_SCENARIO,
    )
    expect(r.players[0].points).toBe(WIN_POINTS + BONUS_POINTS)
    expect(r.players[1].points).toBe(0)
  })

  it('un empate reparte la victoria', () => {
    const r = scoreRound(
      [
        { name: 'Ana', x: 4 },
        { name: 'Beto', x: 4 },
      ],
      BASE_SCENARIO,
    )
    expect(r.players.every((p) => p.winner)).toBe(true)
  })

  it('la tabla agrupa por nombre sin importar mayúsculas', () => {
    const a = scoreRound([{ name: 'Ana', x: 6 }, { name: 'Beto', x: 1 }], BASE_SCENARIO)
    const b = scoreRound([{ name: 'ana ', x: 6 }, { name: 'Caro', x: 12 }], BASE_SCENARIO)
    const table = standings([a, b])
    expect(table[0].name).toBe('Ana')
    expect(table[0].rounds).toBe(2)
    expect(table[0].wins).toBe(2)
  })
})
