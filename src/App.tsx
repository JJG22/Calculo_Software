import { useEffect, useState } from 'react'
import { Logo } from './components/Logo'
import { useHashRoute, useHistory, type Route } from './lib/hooks'
import DuelView from './views/DuelView'
import JoinView from './views/JoinView'
import ModelView from './views/ModelView'
import ScoreboardView from './views/ScoreboardView'

const NAV: { id: Exclude<Route, 'unirse'>; num: string; label: string }[] = [
  { id: 'modelo', num: '01', label: 'Modelo' },
  { id: 'duelo', num: '02', label: 'Duelo' },
  { id: 'marcador', num: '03', label: 'Marcador' },
]

export default function App() {
  const [route, go, param] = useHashRoute()
  const store = useHistory()

  // Celular del jugador: vista propia, sin el menú del stand
  if (route === 'unirse') return <JoinView codeFromUrl={param} />

  return (
    <div className="grid-bg flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-ink-700 bg-ink-950/85 backdrop-blur">
        <div className="hazard-stripes h-1.5" />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <a href="#/modelo" className="flex items-center gap-3">
            <Logo />
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-[0.12em]">
                PLANTA<span className="text-hazard">·</span>IoT
              </div>
              <div className="font-mono text-xs text-ink-400">Mantenimiento predictivo</div>
            </div>
          </a>

          <nav className="flex flex-1 gap-1 sm:justify-center" aria-label="Secciones">
            {NAV.map((n) => {
              const activeTab = route === n.id
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => go(n.id)}
                  aria-current={activeTab ? 'page' : undefined}
                  className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                    activeTab ? 'bg-hazard text-ink-950' : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'
                  }`}
                >
                  <span className={`mr-1.5 font-mono text-xs ${activeTab ? 'text-ink-950/70' : 'text-ink-400'}`}>
                    {n.num}
                  </span>
                  {n.label}
                </button>
              )
            })}
          </nav>

          <FullscreenButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div hidden={route !== 'modelo'}>
          <ModelView />
        </div>
        <div hidden={route !== 'duelo'}>
          <DuelView active={route === 'duelo'} onRecord={store.add} onScoreboard={() => go('marcador')} />
        </div>
        <div hidden={route !== 'marcador'}>
          <ScoreboardView
            history={store.history}
            removeLast={store.removeLast}
            clear={store.clear}
            onDuel={() => go('duelo')}
          />
        </div>
      </main>

      <footer className="border-t border-ink-800 px-4 py-6 text-center text-sm text-ink-400">
        Proyecto 5 · Aplicación de la derivada · Mantenimiento predictivo con sensores IoT
        <br />
        Miguel Caro · Jhon Jairo García · Diego Núñez
      </footer>
    </div>
  )
}

function FullscreenButton() {
  const [isFull, setIsFull] = useState(false)
  useEffect(() => {
    const onChange = () => setIsFull(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    else void document.documentElement.requestFullscreen?.().catch(() => undefined)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="hidden cursor-pointer rounded-lg border border-ink-600 px-3 py-2 font-mono text-xs text-ink-300 hover:border-ink-400 hover:text-ink-100 sm:block"
      title="Pantalla completa para proyectar en el stand"
    >
      {isFull ? '⤡ Salir' : '⤢ Pantalla completa'}
    </button>
  )
}
