import { useState, type ReactNode } from 'react'
import { Chart } from '../components/Chart'
import { Eq, Frac, FormulaG } from '../components/MathText'
import { SectionTitle, Stat, Tag } from '../components/ui'
import { num, signed, usd } from '../lib/format'
import {
  BASE_SCENARIO as S,
  G,
  budgetLeft,
  criticalLhs,
  criticalRhs,
  d2G,
  dG,
  failureCost,
  newtonSteps,
  operatingCost,
  optimum,
  toUSD,
} from '../lib/model'

const X_MAX = 15

export default function ModelView() {
  const xOpt = optimum(S)
  const gOpt = G(xOpt)
  const [x, setX] = useState(2)
  const [showParts, setShowParts] = useState(true)

  const slope = dG(x)
  const curvature = d2G(x)
  const nearOpt = Math.abs(x - xOpt) < 0.15

  const status = nearOpt
    ? { text: 'G′(x) ≈ 0 → estás en el mínimo', cls: 'border-ok/50 bg-ok/10 text-ok' }
    : slope < 0
      ? { text: 'G′(x) < 0 → el gasto BAJA: conviene hacer más mantenimientos', cls: 'border-sensor/50 bg-sensor/10 text-sensor' }
      : { text: 'G′(x) > 0 → el gasto SUBE: te pasaste de mantenimientos', cls: 'border-alarm/50 bg-alarm/10 text-alarm' }

  const trials = [4, 5, 5.5, 5.56, xOpt, 6, 7]
  const newton = newtonSteps(5, 4)
  const integers = [3, 4, 5, 6, 7, 8]
  const bestInt = integers.reduce((a, b) => (G(b) < G(a) ? b : a))

  return (
    <div className="space-y-16">
      {/* ---------------- Portada ---------------- */}
      <section className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="animate-rise">
          <div className="mb-4 flex flex-wrap gap-2">
            <Tag>Proyecto 5</Tag>
            <Tag>Industria 4.0</Tag>
            <Tag>Exponencial + Logarítmica</Tag>
          </div>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            ¿Cuántos mantenimientos al mes <span className="text-hazard">salvan la planta</span>?
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-300">
            Pocos mantenimientos disparan el costo de <span className="text-fail">fallas graves</span>. Demasiados
            inflan el <span className="text-ops">gasto operativo</span> de técnicos y software. La derivada encuentra
            el punto exacto de equilibrio.
          </p>
          <Eq className="mt-6 text-lg sm:text-xl">
            <FormulaG s={S} />
            <div className="mt-1 text-xs text-ink-400">G en cientos de dólares · x = mantenimientos preventivos al mes · x ≥ 0</div>
          </Eq>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Óptimo x*" value={num(xOpt, 2)} sub="mantenimientos / mes" tone="hazard" />
          <Stat label="Gasto mínimo" value={usd(toUSD(gOpt))} sub={`G(x*) ≈ ${num(gOpt, 2)} cientos`} tone="ok" />
          <Stat label="Sin mantenimiento" value={usd(toUSD(G(0)))} sub="G(0) = 200 cientos" tone="alarm" />
          <Stat label="Ahorro vs. x = 0" value={usd(toUSD(G(0) - gOpt))} sub="por mes" tone="sensor" />
        </div>
      </section>

      {/* ---------------- Laboratorio interactivo ---------------- */}
      <section>
        <SectionTitle kicker="Laboratorio" title="Mueve x y mira lo que dice la derivada">
          La recta punteada es la tangente: su pendiente es G′(x). Donde la tangente queda horizontal, el gasto es mínimo.
        </SectionTitle>

        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="panel p-4 sm:p-6">
            <Chart
              ariaLabel="Gráfica del gasto total G(x) con sus componentes y la recta tangente"
              xMin={0}
              xMax={X_MAX}
              yMin={0}
              yMax={210}
              height={380}
              xLabel="x · mantenimientos preventivos al mes"
              yLabel="cientos de USD"
              curves={[
                ...(showParts
                  ? [
                      { f: (t: number) => failureCost(t), color: 'var(--color-fail)', label: 'Fallas 200e^(−0.5x)', dashed: true, width: 2 },
                      { f: (t: number) => operatingCost(t), color: 'var(--color-ops)', label: 'Operativo 40 ln(x+1)', dashed: true, width: 2 },
                    ]
                  : []),
                { f: (t: number) => G(t), color: 'var(--color-hazard)', label: 'Gasto total G(x)', width: 3.5 },
              ]}
              tangent={{ x, y: G(x), slope, color: nearOpt ? 'var(--color-ok)' : 'var(--color-ink-100)' }}
              vLines={[{ x: xOpt, color: 'var(--color-ok)', label: `x* ≈ ${num(xOpt, 2)}` }]}
              markers={[{ x, y: G(x), color: 'var(--color-hazard)', ring: true }]}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="panel p-5">
              <label htmlFor="x-slider" className="flex items-baseline justify-between">
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-ink-400">Mantenimientos x</span>
                <span className="tabular font-mono text-3xl font-bold text-hazard">{num(x, 2)}</span>
              </label>
              <input
                id="x-slider"
                type="range"
                min={0}
                max={X_MAX}
                step={0.01}
                value={x}
                onChange={(e) => setX(Number(e.target.value))}
                className="slider mt-4 w-full"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {[0, 2, 5, 6, 10].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setX(v)}
                    className="cursor-pointer rounded-md border border-ink-600 px-2.5 py-1 font-mono text-xs text-ink-300 hover:border-hazard hover:text-hazard"
                  >
                    x={v}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setX(Number(xOpt.toFixed(2)))}
                  className="cursor-pointer rounded-md border border-ok/50 px-2.5 py-1 font-mono text-xs text-ok hover:bg-ok/10"
                >
                  x*
                </button>
              </div>
              <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-ink-300">
                <input
                  type="checkbox"
                  checked={showParts}
                  onChange={(e) => setShowParts(e.target.checked)}
                  className="accent-[var(--color-hazard)]"
                />
                Mostrar los dos costos por separado
              </label>
            </div>

            <div className="panel divide-y divide-ink-700 font-mono text-sm">
              <Readout label="G(x)" value={`${num(G(x))} cientos`} sub={usd(toUSD(G(x)))} />
              <Readout label="G′(x)" value={signed(slope, 3)} sub="pendiente de la tangente" color={slope < -0.05 ? 'text-sensor' : slope > 0.05 ? 'text-alarm' : 'text-ok'} />
              <Readout label="G″(x)" value={signed(curvature, 3)} sub={curvature > 0 ? 'cóncava hacia arriba' : 'cóncava hacia abajo'} />
              <Readout label="Presupuesto" value={usd(budgetLeft(x))} sub="de $15,000 que quedan" color={budgetLeft(x) < 0 ? 'text-alarm' : 'text-ok'} />
            </div>

            <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${status.cls}`}>{status.text}</div>
          </div>
        </div>

        <div className="panel mt-5 p-4 sm:p-6">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-bold">Gráfica de la derivada G′(x)</h3>
            <span className="text-sm text-ink-400">Corta el eje en x* — ahí cambia de negativa (baja) a positiva (sube)</span>
          </div>
          <Chart
            ariaLabel="Gráfica de la primera derivada G prima de x"
            xMin={0}
            xMax={X_MAX}
            yMin={-62}
            yMax={12}
            height={240}
            zeroLine
            xLabel="x"
            yLabel="G′(x)"
            showLegend={false}
            curves={[{ f: (t: number) => dG(t), color: 'var(--color-sensor)', width: 3 }]}
            vLines={[{ x: xOpt, color: 'var(--color-ok)', label: 'G′ = 0' }]}
            markers={[{ x, y: slope, color: 'var(--color-hazard)' }]}
          />
        </div>
      </section>

      {/* ---------------- Paso a paso ---------------- */}
      <section>
        <SectionTitle kicker="Solución paso a paso" title="De la función al mínimo en 4 pasos" />
        <div className="grid gap-4 md:grid-cols-2">
          <Step n={1} title="Primera derivada (tasa de cambio del gasto)">
            <p>Regla de la cadena en la exponencial y derivada de ln(u) = u′/u:</p>
            <Eq>
              G′(x) = 200(−0.5)e<sup>−0.5x</sup> + <Frac n="40" d="x + 1" />
              <br />
              <span className="text-hazard">
                G′(x) = −100e<sup>−0.5x</sup> + <Frac n="40" d="x + 1" />
              </span>
            </Eq>
          </Step>

          <Step n={2} title="Punto crítico: G′(x) = 0">
            <p>Igualamos a cero y reorganizamos:</p>
            <Eq>
              100e<sup>−0.5x</sup> = <Frac n="40" d="x + 1" /> ⟹{' '}
              <span className="text-hazard">
                (x + 1)e<sup>−0.5x</sup> = {num(criticalRhs(), 1)}
              </span>
            </Eq>
            <p>
              No se puede despejar x con álgebra (x aparece dentro y fuera de la exponencial), por eso se resuelve{' '}
              <b className="text-ink-100">numéricamente</b>.
            </p>
          </Step>

          <Step n={3} title="Verificación con la segunda derivada">
            <Eq>
              G″(x) = 50e<sup>−0.5x</sup> − <Frac n="40" d={<>(x + 1)<sup>2</sup></>} />
              <br />
              G″({num(xOpt, 2)}) ≈ {num(50 * Math.exp(-0.5 * xOpt))} − {num(40 / (xOpt + 1) ** 2)} ={' '}
              <span className="text-ok">+{num(d2G(xOpt))} &gt; 0</span>
            </Eq>
            <p>Como G″ es positiva, la curva es cóncava hacia arriba: el punto crítico es un <b className="text-ok">mínimo</b>.</p>
          </Step>

          <Step n={4} title="Interpretación industrial">
            <Eq>
              x* ≈ <span className="text-hazard">{num(xOpt, 2)}</span> mantenimientos/mes
              <br />
              G(x*) ≈ {num(gOpt, 2)} cientos = <span className="text-ok">{usd(toUSD(gOpt))} USD</span>
            </Eq>
            <p>
              Hay que programar entre <b className="text-ink-100">5 y 6 mantenimientos al mes</b>. Antes de x*, cada
              mantenimiento ahorra más en fallas de lo que cuesta; después de x*, cuesta más de lo que ahorra.
            </p>
          </Step>
        </div>
      </section>

      {/* ---------------- Método numérico ---------------- */}
      <section>
        <SectionTitle kicker="Método numérico" title="Cómo se encontró x* sin poder despejar">
          Buscamos el x donde (x + 1)e<sup>−0.5x</sup> vale exactamente 0.4.
        </SectionTitle>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="panel overflow-hidden">
            <div className="border-b border-ink-700 px-5 py-3 font-bold">1 · Prueba y error (tanteo)</div>
            <table className="tabular w-full font-mono text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="px-5 py-2">x</th>
                  <th className="px-5 py-2">(x+1)e^(−0.5x)</th>
                  <th className="px-5 py-2">G′(x)</th>
                  <th className="px-5 py-2">¿qué hacer?</th>
                </tr>
              </thead>
              <tbody>
                {trials.map((t) => {
                  const d = dG(t)
                  const isOpt = t === xOpt
                  return (
                    <tr key={t} className={`border-t border-ink-800 ${isOpt ? 'bg-ok/10 text-ok' : ''}`}>
                      <td className="px-5 py-2">{isOpt ? `${num(t, 3)} ★` : num(t, 2)}</td>
                      <td className="px-5 py-2">{num(criticalLhs(t), 4)}</td>
                      <td className={`px-5 py-2 ${isOpt ? '' : d < 0 ? 'text-sensor' : 'text-alarm'}`}>{signed(d, 3)}</td>
                      <td className="px-5 py-2 text-ink-300">{isOpt ? '= 0.4 ✓' : d < 0 ? '> 0.4 → subir x' : '< 0.4 → bajar x'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="panel overflow-hidden">
            <div className="border-b border-ink-700 px-5 py-3 font-bold">
              2 · Newton–Raphson: x<sub>n+1</sub> = x<sub>n</sub> − G′(x<sub>n</sub>) / G″(x<sub>n</sub>)
            </div>
            <table className="tabular w-full font-mono text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="px-5 py-2">n</th>
                  <th className="px-5 py-2">x<sub>n</sub></th>
                  <th className="px-5 py-2">G′(x<sub>n</sub>)</th>
                  <th className="px-5 py-2">G″(x<sub>n</sub>)</th>
                </tr>
              </thead>
              <tbody>
                {newton.map((st) => (
                  <tr key={st.n} className="border-t border-ink-800">
                    <td className="px-5 py-2 text-ink-400">{st.n}</td>
                    <td className="px-5 py-2 text-hazard">{st.x.toFixed(6)}</td>
                    <td className="px-5 py-2">{st.g1.toExponential(2).replace('-', '−')}</td>
                    <td className="px-5 py-2">{num(st.g2, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-ink-700 px-5 py-3 text-sm text-ink-300">
              Partiendo de x₀ = 5, en 3 iteraciones ya tenemos 6 decimales correctos: x* = {xOpt.toFixed(6)}.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-hazard/40 bg-hazard/5 px-5 py-4 text-sm text-ink-200">
          <b className="text-hazard">Nota de precisión:</b> el documento aproxima x* ≈ 5.56 y G ≈ 87.67 haciendo el
          tanteo a mano. Con más decimales, x* ≈ {num(xOpt, 3)} y G(x*) ≈ {num(gOpt, 3)}. La curva es tan plana cerca
          del mínimo que la diferencia de gasto entre ambos valores es de{' '}
          <b className="text-ink-100">{usd(Math.max(1, toUSD(G(5.56) - gOpt)))} o menos</b>: las dos respuestas son
          correctas en la práctica.
        </div>
      </section>

      {/* ---------------- Decisión entera ---------------- */}
      <section>
        <SectionTitle kicker="Decisión de planta" title="Pero no se pueden hacer 5.61 mantenimientos…">
          En la vida real se programa un número entero. Comparamos los vecinos del óptimo:
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {integers.map((n) => {
            const best = n === bestInt
            return (
              <div
                key={n}
                className={`rounded-xl border px-4 py-3 ${best ? 'border-ok bg-ok/10' : 'border-ink-700 bg-ink-900'}`}
              >
                <div className="font-mono text-xs text-ink-400">x = {n}</div>
                <div className={`tabular font-mono text-xl font-semibold ${best ? 'text-ok' : ''}`}>{usd(toUSD(G(n)))}</div>
                <div className="font-mono text-xs text-ink-400">G = {num(G(n))}</div>
                {best && <div className="mt-1 text-xs font-bold text-ok">MEJOR ENTERO</div>}
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-ink-300">
          Recomendación: <b className="text-ink-100">{bestInt} mantenimientos al mes</b> — solo{' '}
          {usd(toUSD(G(bestInt) - gOpt))} por encima del mínimo teórico. Alternar meses de 5 y 6 también funciona.
        </p>
      </section>

      {/* ---------------- Guion ---------------- */}
      <section>
        <SectionTitle kicker="Guion del stand" title="La explicación en 60 segundos" />
        <ol className="grid gap-3 md:grid-cols-2">
          {[
            'Una planta con sensores IoT debe decidir cuántos mantenimientos preventivos hacer al mes (x).',
            'Si hace pocos, las fallas graves cuestan muchísimo: 200e^(−0.5x) cae rápido al aumentar x.',
            'Si hace muchos, pagan técnicos y software: 40 ln(x+1) crece despacio pero nunca para.',
            'El gasto total G(x) tiene forma de valle. El fondo del valle es donde la pendiente G′(x) vale 0.',
            'G′(x) = 0 lleva a (x+1)e^(−0.5x) = 0.4, que resolvemos numéricamente: x* ≈ 5.6.',
            'G″(x*) > 0 confirma que es un mínimo: unos $8,765 al mes. ¡Ahora compitan ustedes!',
          ].map((t, i) => (
            <li key={i} className="panel flex gap-4 p-4">
              <span className="font-mono text-2xl font-bold text-hazard">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-ink-200">{t}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function Readout({ label, value, sub, color = 'text-ink-100' }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-5 py-3">
      <div>
        <div className="text-ink-400">{label}</div>
        <div className="text-[11px] text-ink-500">{sub}</div>
      </div>
      <div className={`tabular text-lg font-semibold ${color}`}>{value}</div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <article className="panel space-y-3 p-5 text-ink-300">
      <header className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-lg bg-hazard font-mono font-bold text-ink-950">{n}</span>
        <h3 className="font-bold text-ink-100">{title}</h3>
      </header>
      {children}
    </article>
  )
}
