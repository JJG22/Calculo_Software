/** Efectos de sonido sintetizados con Web Audio (sin archivos externos). */

const MUTE_KEY = 'planta-iot-duelo/silencio'
let ctx: AudioContext | null = null

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    /* ignorar */
  }
}

function audio(): AudioContext | null {
  if (isMuted()) return null
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur = 0.12, delay = 0, type: OscillatorType = 'square', vol = 0.05) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(a.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export const sfx = {
  key: () => tone(880, 0.04, 0, 'square', 0.02),
  confirm: () => {
    tone(523, 0.08, 0, 'triangle', 0.06)
    tone(784, 0.12, 0.08, 'triangle', 0.06)
  },
  tick: () => tone(1200, 0.03, 0, 'sine', 0.03),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, i * 0.12, 'triangle', 0.08)),
  alarm: () => {
    tone(220, 0.25, 0, 'sawtooth', 0.04)
    tone(180, 0.3, 0.25, 'sawtooth', 0.04)
  },
}
