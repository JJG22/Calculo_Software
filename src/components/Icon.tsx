import type { ReactNode } from 'react'
import type { SoloTier } from '../lib/scoring'

/**
 * Íconos dibujados (trazo 2px, esquinas redondeadas, retícula de 24px) en lugar de emojis,
 * para que se vean iguales en cualquier sistema y nítidos en el proyector.
 */
export type IconName =
  | 'arrow-right'
  | 'check'
  | 'circle-check'
  | 'trophy'
  | 'alert'
  | 'rotate'
  | 'undo'
  | 'download'
  | 'monitor'
  | 'phone'
  | 'volume'
  | 'volume-off'
  | 'timer'
  | 'send'
  | 'trending-down'
  | 'factory'
  | 'maximize'
  | 'minimize'
  | 'medal'
  | 'wrench'

const PATHS: Record<IconName, ReactNode> = {
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  'circle-check': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  ),
  alert: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  rotate: (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </>
  ),
  monitor: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </>
  ),
  phone: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 18h.01" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </>
  ),
  'volume-off': (
    <>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="m22 9-6 6" />
      <path d="m16 9 6 6" />
    </>
  ),
  timer: (
    <>
      <path d="M10 2h4" />
      <path d="m12 14 3-3" />
      <circle cx="12" cy="14" r="8" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  'trending-down': (
    <>
      <path d="m22 17-8.5-8.5-5 5L2 7" />
      <path d="M16 17h6v-6" />
    </>
  ),
  factory: (
    <>
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M17 18h1" />
      <path d="M12 18h1" />
      <path d="M7 18h1" />
    </>
  ),
  maximize: (
    <>
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="m21 3-7 7" />
      <path d="m3 21 7-7" />
    </>
  ),
  minimize: (
    <>
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="m14 10 7-7" />
      <path d="m3 21 7-7" />
    </>
  ),
  medal: (
    <>
      <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" />
      <path d="M11 12 5.12 2.2" />
      <path d="m13 12 5.88-9.8" />
      <path d="M8 7h8" />
      <circle cx="12" cy="17" r="5" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
}

export function Icon({ name, className = 'size-4', title }: { name: IconName; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {PATHS[name]}
    </svg>
  )
}

const TIER_COLORS: Record<SoloTier, string> = {
  oro: '#f5c542',
  plata: '#c3ccd6',
  bronce: '#d08a4a',
  ninguna: 'var(--color-ink-400)',
}

const TIER_NAMES: Record<SoloTier, string> = {
  oro: 'Medalla de oro',
  plata: 'Medalla de plata',
  bronce: 'Medalla de bronce',
  ninguna: 'Sin medalla',
}

/** Medalla del reto en solitario (o llave inglesa si no hubo medalla). */
export function TierIcon({ tier, className = 'size-5' }: { tier: SoloTier; className?: string }) {
  return (
    <span className="inline-flex" style={{ color: TIER_COLORS[tier] }}>
      <Icon name={tier === 'ninguna' ? 'wrench' : 'medal'} className={className} title={TIER_NAMES[tier]} />
    </span>
  )
}
