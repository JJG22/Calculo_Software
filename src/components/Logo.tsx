/**
 * Logo: una "e" minúscula — el número de Euler de 200e^(−0.5x), la función exponencial del modelo —
 * sobre la placa amarilla de la planta.
 */
export function Logo({ size = 38, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="32" height="32" rx="7" fill="var(--color-hazard)" />
      {/* Barra horizontal y arco de la "e", abierta abajo a la derecha */}
      <path
        d="M9.5 16.5 H22.5 A6.5 6.5 0 1 0 20.6 21.1"
        fill="none"
        stroke="var(--color-ink-950)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
