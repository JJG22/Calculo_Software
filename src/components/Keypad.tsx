import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { sfx } from '../lib/sound'

interface KeypadProps {
  value: string
  setValue: Dispatch<SetStateAction<string>>
  onSubmit: () => void
  max: number
  /** Solo escucha el teclado físico cuando está activo */
  active: boolean
  accent: string
}

const MAX_DECIMALS = 2

export function appendKey(cur: string, key: string, max: number): string {
  if (key === '.') {
    if (cur.includes('.')) return cur
    return (cur === '' ? '0' : cur) + '.'
  }
  if (cur.includes('.')) {
    if (cur.split('.')[1].length >= MAX_DECIMALS) return cur
    const next = cur + key
    return Number(next) > max ? cur : next
  }
  const next = cur === '0' ? key : cur + key
  return Number(next) > max ? cur : next
}

export function isValidEntry(v: string, max: number): boolean {
  if (v === '' || v.endsWith('.')) return false
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 && n <= max
}

export function Keypad({ value, setValue, onSubmit, max, active, accent }: KeypadProps) {
  const submitRef = useRef(onSubmit)
  submitRef.current = onSubmit

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (/^[0-9]$/.test(e.key)) {
        setValue((v) => appendKey(v, e.key, max))
        sfx.key()
      } else if (e.key === '.' || e.key === ',') {
        setValue((v) => appendKey(v, '.', max))
      } else if (e.key === 'Backspace') {
        setValue((v) => v.slice(0, -1))
      } else if (e.key === 'Escape') {
        setValue('')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        submitRef.current()
      } else {
        return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, max, setValue])

  const press = (k: string) => {
    sfx.key()
    if (k === '⌫') setValue((v) => v.slice(0, -1))
    else setValue((v) => appendKey(v, k, max))
  }

  const valid = isValidEntry(value, max)

  return (
    <div className="w-full">
      <div
        className="mb-4 flex h-24 items-center justify-end rounded-2xl border-2 bg-ink-950 px-5 font-mono"
        style={{ borderColor: accent }}
        aria-live="polite"
      >
        <span className="tabular text-6xl font-bold" style={{ color: value ? accent : 'var(--color-ink-600)' }}>
          {value || '0'}
        </span>
        <span className="ml-1 h-12 w-1 animate-blink" style={{ background: accent }} />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className="h-16 cursor-pointer rounded-xl border border-ink-600 bg-ink-800 font-mono text-2xl font-semibold text-ink-100 transition hover:border-ink-400 hover:bg-ink-700 active:scale-95"
            aria-label={k === '⌫' ? 'Borrar' : k === '.' ? 'Punto decimal' : k}
          >
            {k}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!valid}
        onClick={onSubmit}
        className="mt-3 h-16 w-full cursor-pointer rounded-xl font-bold uppercase tracking-[0.15em] text-ink-950 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
        style={{ background: accent }}
      >
        Confirmar decisión ⏎
      </button>
    </div>
  )
}
