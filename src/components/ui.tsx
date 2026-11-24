import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-hazard text-ink-950 hover:bg-[#ffc24d] shadow-[0_0_0_1px_rgb(255_176_32/0.4),0_8px_30px_-10px_rgb(255_176_32/0.6)]',
  ghost: 'border border-ink-600 bg-ink-800/60 text-ink-100 hover:border-ink-400 hover:bg-ink-700',
  danger: 'border border-alarm/50 bg-alarm/10 text-alarm hover:bg-alarm/20',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hazard disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
    />
  )
}

/** Etiqueta pequeña tipo placa industrial. */
export function Tag({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-ink-600 bg-ink-800 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-300 ${className}`}
    >
      {children}
    </span>
  )
}

export function SectionTitle({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 max-w-3xl">
      <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-hazard">{kicker}</div>
      <h2 className="text-2xl font-bold tracking-tight text-ink-100 sm:text-3xl">{title}</h2>
      {children && <p className="mt-2 text-ink-300">{children}</p>}
    </div>
  )
}

export function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'hazard' | 'ok' | 'alarm' | 'sensor'
}) {
  const color = {
    default: 'text-ink-100',
    hazard: 'text-hazard',
    ok: 'text-ok',
    alarm: 'text-alarm',
    sensor: 'text-sensor',
  }[tone]
  return (
    <div className="panel px-4 py-3">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className={`tabular mt-1 font-mono text-2xl font-semibold ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-400">{sub}</div>}
    </div>
  )
}

export const PLAYER_COLORS = ['#3ad4e0', '#ff8a3d', '#c08cff', '#3ddc84'] as const
