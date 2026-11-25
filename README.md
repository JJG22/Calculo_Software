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
| **02 · Duelo** | *Gerentes de Planta en Crisis*: 2–4 gerentes reciben $15,000, eligen en secreto cuántos mantenimientos hacer, el sistema evalúa G(x) y gana quien conserve más presupuesto. Modo **Clásico** (modelo oficial) y **Experto** (plantas sorpresa). |
| **03 · Marcador** | Ranking acumulado (se guarda en el navegador del stand), podio, historial, deshacer y exportar CSV. |

El duelo tiene dos formas de jugar:

- **📱 En línea (celulares):** la pantalla del stand muestra un QR y un código de 4 letras. Cada jugador entra desde su celular, decide en secreto y el resultado aparece a la vez en la pantalla grande y en cada celular. Si alguien pierde la señal, al volver recupera su puesto.
- **🖥 Un dispositivo:** todos juegan por turnos en el mismo computador. Es el respaldo si no hay internet.

**Puntos:** ganar la ronda = +3 · quedar a ±0.3 del óptimo = +1 (bono de precisión).

## Ejecutar en local

Requiere Node.js 20.19 o superior.

```bash
npm install
npm run dev        # app en http://localhost:5173 + servidor de salas en :3000
npm test           # pruebas del modelo, la puntuación y las salas
npm run build      # genera dist/ (app) y build-server/ (servidor)
npm start          # sirve todo en http://localhost:3000, igual que en Render
```

Para probar con celulares en local, abre la app con la dirección **Network** que muestra la terminal (por ejemplo `http://192.168.1.20:5173`), con el computador y los celulares en la misma red wifi. Con `localhost` los celulares no pueden entrar.

## Desplegar en Render

1. Sube esta carpeta a un repositorio de GitHub.
2. En [Render](https://render.com): **New → Blueprint** y elige el repositorio. Render lee `render.yaml` y crea un **Web Service** de Node (plan gratuito).
   - Alternativa manual: **New → Web Service**, *Build command* `npm ci && npm run build`, *Start command* `npm start`.
3. Cada `git push` vuelve a desplegar.

> En el plan gratuito, el servidor se duerme tras 15 minutos sin uso y tarda ~1 minuto en despertar. Abre la página unos minutos antes de empezar.

## Estructura

```
server/
  index.ts            Express (sirve dist/) + WebSocket en /ws
  rooms.ts            lógica de salas: crear, unirse, reconectar, rondas
src/
  lib/model.ts        G, G′, G″, bisección, Newton–Raphson, escenarios
  lib/scoring.ts      puntuación, ranking, CSV
  lib/protocol.ts     mensajes entre navegador y servidor
  lib/online.ts       conexión WebSocket con reconexión automática
  components/online/HostRoom.tsx   pantalla del stand (QR, sala, rondas)
  views/JoinView.tsx  vista del celular del jugador (#/unirse/CODIGO)
  views/              Modelo · Duelo · Marcador
```
