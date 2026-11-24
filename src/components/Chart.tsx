import { useId } from 'react'

export interface Curve {
  f: (x: number) => number
  color: string
  label?: string
  dashed?: boolean
  width?: number
  opacity?: number
}

export interface Marker {
  x: number
  y: number
  color: string
  label?: string
  ring?: boolean
  size?: number
}

export interface Tangent {
  x: number
  y: number
  slope: number
  color: string
}

export interface VLine {
  x: number
  color: string
  label?: string
}

interface ChartProps {
  xMin: number
  xMax: number
  yMin?: number
  yMax?: number
  curves: Curve[]
  markers?: Marker[]
  tangent?: Tangent
  vLines?: VLine[]
  zeroLine?: boolean
  height?: number
  xLabel?: string
  yLabel?: string
  samples?: number
  showLegend?: boolean
  ariaLabel: string
}

const W = 800
const PAD = { l: 60, r: 20, t: 22, b: 46 }

function niceStep(range: number, count: number) {
  const raw = range / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10
  return step * mag
}

function ticks(min: number, max: number, count: number): number[] {
  if (!(max > min)) return [min]
  const step = niceStep(max - min, count)
  const first = Math.ceil(min / step)
  const out: number[] = []
  for (let i = first; i * step <= max + step * 1e-9; i++) {
    const v = i * step
    out.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toPrecision(12)))
  }
  return out
}

const tickLabel = (v: number) => {
  const s = Math.abs(v) >= 100 || Number.isInteger(v) ? v.toFixed(0) : String(Number(v.toFixed(2)))
  return v < 0 ? s.replace('-', '−') : s
}

export function Chart({
  xMin,
  xMax,
  yMin,
  yMax,
  curves,
  markers = [],
  tangent,
  vLines = [],
  zeroLine = false,
  height = 360,
  xLabel,
  yLabel,
  samples = 260,
  showLegend = true,
  ariaLabel,
}: ChartProps) {
  const H = height
  const clipId = `clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  const xs = Array.from({ length: samples + 1 }, (_, i) => xMin + ((xMax - xMin) * i) / samples)
  const series = curves.map((c) => xs.map((x) => c.f(x)))

  let lo = yMin ?? Infinity
  let hi = yMax ?? -Infinity
  if (yMin === undefined || yMax === undefined) {
    for (const s of series) {
      for (const v of s) {
        if (!Number.isFinite(v)) continue
        if (yMin === undefined) lo = Math.min(lo, v)
        if (yMax === undefined) hi = Math.max(hi, v)
      }
    }
    if (zeroLine) {
      if (yMin === undefined) lo = Math.min(lo, 0)
      if (yMax === undefined) hi = Math.max(hi, 0)
    }
    const pad = (hi - lo) * 0.08 || 1
    if (yMin === undefined) lo -= pad
    if (yMax === undefined) hi += pad
  }

  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const sx = (x: number) => PAD.l + ((x - xMin) / (xMax - xMin)) * plotW
  const sy = (y: number) => PAD.t + (1 - (y - lo) / (hi - lo)) * plotH

  const toPath = (ys: number[]) =>
    ys
      .map((y, i) => {
        const cy = Math.max(-5000, Math.min(5000, sy(y)))
        return `${i ? 'L' : 'M'}${sx(xs[i]).toFixed(1)},${cy.toFixed(1)}`
      })
      .join('')

  const xt = ticks(xMin, xMax, 10)
  const yt = ticks(lo, hi, 6)

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none" role="img" aria-label={ariaLabel}>
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.l} y={PAD.t} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Cuadrícula */}
        {yt.map((v) => (
          <g key={`y${v}`}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} stroke="var(--color-ink-700)" strokeWidth={1} />
            <text
              x={PAD.l - 10}
              y={sy(v)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-ink-400 font-mono text-[12px]"
            >
              {tickLabel(v)}
            </text>
          </g>
        ))}
        {xt.map((v) => (
          <g key={`x${v}`}>
            <line x1={sx(v)} x2={sx(v)} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-ink-800)" strokeWidth={1} />
            <text x={sx(v)} y={H - PAD.b + 20} textAnchor="middle" className="fill-ink-400 font-mono text-[12px]">
              {tickLabel(v)}
            </text>
          </g>
        ))}

        {zeroLine && lo < 0 && hi > 0 && (
          <line x1={PAD.l} x2={W - PAD.r} y1={sy(0)} y2={sy(0)} stroke="var(--color-ink-400)" strokeWidth={1.5} />
        )}

        <rect
          x={PAD.l}
          y={PAD.t}
          width={plotW}
          height={plotH}
          fill="none"
          stroke="var(--color-ink-600)"
          strokeWidth={1}
        />

        <g clipPath={`url(#${clipId})`}>
          {vLines.map((v, i) => (
            <g key={`v${i}`}>
              <line
                x1={sx(v.x)}
                x2={sx(v.x)}
                y1={PAD.t}
                y2={H - PAD.b}
                stroke={v.color}
                strokeWidth={1.5}
                strokeDasharray="5 5"
              />
              {v.label && (
                <text x={sx(v.x) + 6} y={PAD.t + 16} className="font-mono text-[12px]" fill={v.color}>
                  {v.label}
                </text>
              )}
            </g>
          ))}

          {series.map((ys, i) => (
            <path
              key={i}
              d={toPath(ys)}
              fill="none"
              stroke={curves[i].color}
              strokeWidth={curves[i].width ?? 3}
              strokeOpacity={curves[i].opacity ?? 1}
              strokeDasharray={curves[i].dashed ? '7 6' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {tangent && (
            <line
              x1={sx(xMin)}
              y1={sy(tangent.y + tangent.slope * (xMin - tangent.x))}
              x2={sx(xMax)}
              y2={sy(tangent.y + tangent.slope * (xMax - tangent.x))}
              stroke={tangent.color}
              strokeWidth={2}
              strokeDasharray="2 5"
              strokeLinecap="round"
            />
          )}

          {markers.map((m, i) => (
            <g key={`m${i}`}>
              {m.ring && (
                <circle cx={sx(m.x)} cy={sy(m.y)} r={6} fill="none" stroke={m.color} strokeWidth={2} className="marker-ring" />
              )}
              <circle
                cx={sx(m.x)}
                cy={sy(m.y)}
                r={m.size ?? 7}
                fill={m.color}
                stroke="var(--color-ink-950)"
                strokeWidth={3}
              />
            </g>
          ))}
        </g>

        {/* Etiquetas de marcadores (fuera del recorte para que no se corten) */}
        {markers.map((m, i) =>
          m.label ? (
            <text
              key={`ml${i}`}
              x={Math.min(W - PAD.r - 4, Math.max(PAD.l + 4, sx(m.x)))}
              y={Math.max(PAD.t + 12, sy(m.y) - 16 - (i % 2) * 16)}
              textAnchor="middle"
              className="font-mono text-[13px] font-semibold"
              fill={m.color}
              stroke="var(--color-ink-950)"
              strokeWidth={4}
              paintOrder="stroke"
            >
              {m.label}
            </text>
          ) : null,
        )}

        {xLabel && (
          <text x={PAD.l + plotW / 2} y={H - 6} textAnchor="middle" className="fill-ink-300 text-[13px]">
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text
            x={16}
            y={PAD.t + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${PAD.t + plotH / 2})`}
            className="fill-ink-300 text-[13px]"
          >
            {yLabel}
          </text>
        )}
      </svg>

      {showLegend && curves.some((c) => c.label) && (
        <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 pl-[7.5%] text-sm text-ink-300">
          {curves
            .filter((c) => c.label)
            .map((c) => (
              <span key={c.label} className="inline-flex items-center gap-2">
                <svg width="26" height="8" aria-hidden>
                  <line
                    x1="1"
                    y1="4"
                    x2="25"
                    y2="4"
                    stroke={c.color}
                    strokeWidth={3}
                    strokeDasharray={c.dashed ? '5 4' : undefined}
                    strokeLinecap="round"
                  />
                </svg>
                {c.label}
              </span>
            ))}
        </figcaption>
      )}
    </figure>
  )
}
