import type { ReactNode } from 'react'
import type { Scenario } from '../lib/model'

/** Fracción en línea, apilada. */
export function Frac({ n, d }: { n: ReactNode; d: ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex flex-col items-center text-center align-middle text-[0.82em] leading-[1.15]">
      <span className="border-b border-current px-1">{n}</span>
      <span className="px-1">{d}</span>
    </span>
  )
}

/** Bloque de fórmula destacada. */
export function Eq({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-x-auto rounded-xl border border-ink-700 bg-ink-950/70 px-4 py-3 font-mono text-[15px] leading-relaxed text-ink-100 sm:text-base ${className}`}
    >
      {children}
    </div>
  )
}

/** G(x) para cualquier escenario, con los dos términos coloreados. */
export function FormulaG({ s, name = 'G(x)' }: { s: Scenario; name?: string }) {
  return (
    <span className="whitespace-nowrap font-mono">
      {name} = <span className="text-fail">{s.a}e<sup>−{s.b}x</sup></span> +{' '}
      <span className="text-ops">{s.c} ln(x + 1)</span>
    </span>
  )
}
