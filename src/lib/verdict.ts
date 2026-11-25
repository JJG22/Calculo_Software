import { qty, signed } from './format'
import { BONUS_TOLERANCE } from './scoring'

export interface Verdict {
  title: string
  cls: string
  text: string
}

/** Explica con G′(x) si al jugador le faltaron o le sobraron mantenimientos. */
export function verdict(p: { x: number; slope: number }, xOpt: number): Verdict {
  if (Math.abs(p.x - xOpt) <= BONUS_TOLERANCE) {
    return {
      title: 'Zona óptima',
      cls: 'text-ok',
      text: `G′(${qty(p.x)}) = ${signed(p.slope, 2)} ≈ 0: estás en el fondo del valle.`,
    }
  }
  if (p.slope < 0) {
    return {
      title: 'Te quedaste corto',
      cls: 'text-sensor',
      text: `G′(${qty(p.x)}) = ${signed(p.slope, 2)} < 0: el gasto todavía bajaba. Más mantenimientos te habrían ahorrado dinero.`,
    }
  }
  return {
    title: 'Te pasaste',
    cls: 'text-alarm',
    text: `G′(${qty(p.x)}) = ${signed(p.slope, 2)} > 0: cada mantenimiento extra ya aumentaba el gasto.`,
  }
}
