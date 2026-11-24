/**
 * Modelo matemático del Proyecto 5 — Mantenimiento predictivo IoT.
 *
 *   G(x) = a·e^(−b·x) + c·ln(x + 1)        (cientos de dólares)
 *
 * Modelo oficial: a = 200, b = 0.5, c = 40.
 * - a·e^(−b·x): costo por fallas graves (cae exponencialmente con más mantenimientos)
 * - c·ln(x+1):  gasto operativo de técnicos y software (crece logarítmicamente)
 */

export interface Scenario {
  id: string
  name: string
  tagline: string
  /** Costo máximo por fallas (cientos de USD) */
  a: number
  /** Tasa con la que el mantenimiento reduce las fallas */
  b: number
  /** Peso del gasto operativo (cientos de USD) */
  c: number
  /** Presupuesto mensual del gerente (USD) */
  budget: number
}

export const BASE_SCENARIO: Scenario = {
  id: 'oficial',
  name: 'Planta IoT — modelo oficial',
  tagline: 'El modelo resuelto del proyecto',
  a: 200,
  b: 0.5,
  c: 40,
  budget: 15000,
}

/** Plantas "sorpresa" para el modo experto: mismo tipo de función, otros parámetros. */
export const EXPERT_SCENARIOS: Scenario[] = [
  {
    id: 'bebidas',
    name: 'Embotelladora de bebidas',
    tagline: 'Fallas más caras, desgaste más lento',
    a: 300,
    b: 0.4,
    c: 50,
    budget: 15000,
  },
  {
    id: 'fundicion',
    name: 'Fundición de acero',
    tagline: 'Fallas catastróficas, pero muy prevenibles',
    a: 500,
    b: 0.6,
    c: 60,
    budget: 20000,
  },
  {
    id: 'ensambladora',
    name: 'Ensambladora de motos',
    tagline: 'Técnicos costosos, fallas moderadas',
    a: 150,
    b: 0.3,
    c: 30,
    budget: 12000,
  },
]

export const ALL_SCENARIOS: Scenario[] = [BASE_SCENARIO, ...EXPERT_SCENARIOS]

export function getScenario(id: string): Scenario {
  return ALL_SCENARIOS.find((s) => s.id === id) ?? BASE_SCENARIO
}

/** Costo por fallas graves: a·e^(−bx) */
export const failureCost = (x: number, s: Scenario = BASE_SCENARIO) => s.a * Math.exp(-s.b * x)

/** Gasto operativo: c·ln(x+1) */
export const operatingCost = (x: number, s: Scenario = BASE_SCENARIO) => s.c * Math.log(x + 1)

/** Gasto total G(x), en cientos de dólares */
export const G = (x: number, s: Scenario = BASE_SCENARIO) => failureCost(x, s) + operatingCost(x, s)

/** G′(x) = −a·b·e^(−bx) + c/(x+1) */
export const dG = (x: number, s: Scenario = BASE_SCENARIO) =>
  -s.a * s.b * Math.exp(-s.b * x) + s.c / (x + 1)

/** G″(x) = a·b²·e^(−bx) − c/(x+1)² */
export const d2G = (x: number, s: Scenario = BASE_SCENARIO) =>
  s.a * s.b * s.b * Math.exp(-s.b * x) - s.c / ((x + 1) * (x + 1))

/**
 * Reescritura de G′(x) = 0:
 *   a·b·e^(−bx) = c/(x+1)  ⇔  (x+1)·e^(−bx) = c/(a·b)
 * Para el modelo oficial: (x+1)·e^(−0.5x) = 0.4
 */
export const criticalLhs = (x: number, s: Scenario = BASE_SCENARIO) => (x + 1) * Math.exp(-s.b * x)
export const criticalRhs = (s: Scenario = BASE_SCENARIO) => s.c / (s.a * s.b)

const optimumCache = new Map<string, number>()

/**
 * Punto crítico x* donde G′(x*) = 0, por bisección.
 * Con c < a·b, G′(0) = c − a·b < 0 y G′ cambia de signo una sola vez,
 * así que la bisección es robusta.
 */
export function optimum(s: Scenario = BASE_SCENARIO): number {
  const key = `${s.a}|${s.b}|${s.c}`
  const cached = optimumCache.get(key)
  if (cached !== undefined) return cached

  let lo = 0
  let hi = 1
  while (dG(hi, s) < 0 && hi < 1e4) {
    lo = hi
    hi *= 2
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (dG(mid, s) < 0) lo = mid
    else hi = mid
  }
  const x = (lo + hi) / 2
  optimumCache.set(key, x)
  return x
}

export interface NewtonStep {
  n: number
  x: number
  g1: number
  g2: number
  next: number
}

/** Iteraciones de Newton–Raphson sobre G′(x) = 0:  x₊ = x − G′(x)/G″(x) */
export function newtonSteps(x0: number, steps: number, s: Scenario = BASE_SCENARIO): NewtonStep[] {
  const out: NewtonStep[] = []
  let x = x0
  for (let n = 0; n < steps; n++) {
    const g1 = dG(x, s)
    const g2 = d2G(x, s)
    const next = x - g1 / g2
    out.push({ n, x, g1, g2, next })
    x = next
  }
  return out
}

/** G está en cientos de dólares → USD */
export const toUSD = (cientos: number) => cientos * 100

/** Presupuesto que conserva un gerente al programar x mantenimientos */
export const budgetLeft = (x: number, s: Scenario = BASE_SCENARIO) => s.budget - toUSD(G(x, s))
