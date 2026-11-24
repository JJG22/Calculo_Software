# Planta IoT · Gerentes de Planta en Crisis

Stand interactivo del **Proyecto 5 — Mantenimiento predictivo con sensores IoT** (Cálculo Diferencial).

```
G(x) = 200e^(−0.5x) + 40 ln(x + 1)      (cientos de USD, x = mantenimientos/mes)
G′(x) = −100e^(−0.5x) + 40/(x + 1) = 0  ⟹  (x + 1)e^(−0.5x) = 0.4  ⟹  x* ≈ 5.61
G″(x*) > 0  ⟹  mínimo:  G(x*) ≈ 87.65 cientos ≈ $8,765 USD
```

## Qué incluye

| Vista | Para qué sirve en el stand |
|---|---|
| **01 · Modelo** | Explicación: laboratorio con deslizador, recta tangente, gráfica de G′(x), los 4 pasos de la solución, método numérico (tanteo + Newton–Raphson), decisión entera y guion de 60 s. |
| **02 · Duelo** | *Gerentes de Planta en Crisis* (opción A del proyecto): 2–4 visitantes reciben $15,000, ingresan **en secreto** cuántos mantenimientos harán (teclado en pantalla o físico), el sistema evalúa G(x) y gana quien conserve más presupuesto. Modo **Clásico** (modelo oficial) y **Experto** (plantas sorpresa con otros parámetros). Reloj de 4 min por pareja. |
| **03 · Marcador** | Ranking acumulado (se guarda en el navegador), podio, historial, deshacer última ronda y exportar CSV para Excel. |

**Puntos:** ganar la ronda = +3 · quedar a ±0.3 del óptimo = +1 (bono de precisión).

## Ejecutar en local

Requiere Node.js 20.19 o superior.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas del modelo matemático y la puntuación
npm run build      # genera dist/
npm run preview    # sirve dist/ (útil el día de la feria sin internet)
```

## Desplegar en Render

1. Sube esta carpeta a un repositorio de GitHub.
2. En [Render](https://render.com): **New → Blueprint** y elige el repositorio. Render lee `render.yaml` y crea un *Static Site*.
   - Alternativa manual: **New → Static Site**, *Build command* `npm install && npm run build`, *Publish directory* `dist`.
3. Cada `git push` vuelve a desplegar.

## Estructura

```
src/
  lib/model.ts        G, G′, G″, bisección, Newton–Raphson, escenarios
  lib/scoring.ts      puntuación del duelo, ranking, CSV
  lib/hooks.ts        rutas por hash, historial en localStorage, animaciones
  components/Chart.tsx  gráficas SVG propias (tangente, marcadores)
  views/              Modelo · Duelo · Marcador
```
