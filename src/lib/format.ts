const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

/** $8,765 */
export const usd = (n: number) => usdFormatter.format(Math.round(n))

/** Número con decimales fijos, usando el signo menos tipográfico. */
export const num = (n: number, digits = 2) => {
  const s = Math.abs(n).toFixed(digits)
  return n < 0 && Number(s) !== 0 ? `−${s}` : s
}

/** Igual que num, pero siempre con signo (+/−). */
export const signed = (n: number, digits = 2) => {
  const s = Math.abs(n).toFixed(digits)
  if (Number(s) === 0) return s
  return `${n < 0 ? '−' : '+'}${s}`
}

/** Mantenimientos: sin decimales innecesarios (5 → "5", 5.6 → "5.6"). */
export const qty = (x: number) => String(Number(x.toFixed(2)))

export const mmss = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
