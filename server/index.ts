import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { WebSocket, WebSocketServer } from 'ws'
import { parseClientMsg, type ServerMsg } from '../src/lib/protocol'
import { RoomManager, type Conn } from './rooms'

const PORT = Number(process.env.PORT) || 3000
const here = path.dirname(fileURLToPath(import.meta.url))
// build-server/index.js y server/index.ts están ambos un nivel debajo de la raíz
const distDir = path.resolve(here, '..', 'dist')

const manager = new RoomManager()
const app = express()
app.disable('x-powered-by')

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, rooms: manager.rooms.size })
})

if (existsSync(distDir)) {
  app.use(
    express.static(distDir, {
      setHeaders(res, filePath) {
        // Los assets llevan hash en el nombre: caché larga. index.html: siempre fresco.
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache')
        else res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      },
    }),
  )
  app.use((_req, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(distDir, 'index.html'))
  })
} else {
  app.get('/', (_req, res) => {
    res.type('text').send('Servidor de salas activo. En desarrollo abre la app en el puerto de Vite (5173).')
  })
}

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4 * 1024 })

const RATE_LIMIT = 30 // mensajes por segundo y conexión

wss.on('connection', (ws) => {
  let alive = true
  let windowStart = Date.now()
  let count = 0

  const conn: Conn = {
    send(msg: ServerMsg) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    },
  }

  ws.on('pong', () => {
    alive = true
  })

  const heartbeat = setInterval(() => {
    if (!alive) {
      ws.terminate()
      return
    }
    alive = false
    ws.ping()
  }, 25_000)

  ws.on('message', (data) => {
    const t = Date.now()
    if (t - windowStart > 1000) {
      windowStart = t
      count = 0
    }
    if (++count > RATE_LIMIT) return

    let raw: unknown
    try {
      raw = JSON.parse(data.toString())
    } catch {
      return conn.send({ t: 'error', code: 'bad_message', message: 'Mensaje inválido.' })
    }
    const msg = parseClientMsg(raw)
    if (!msg) return conn.send({ t: 'error', code: 'bad_message', message: 'Mensaje inválido.' })
    try {
      manager.handle(conn, msg)
    } catch (err) {
      console.error('Error manejando mensaje', msg.t, err)
    }
  })

  ws.on('close', () => {
    clearInterval(heartbeat)
    manager.disconnect(conn)
  })
  ws.on('error', () => ws.terminate())
})

setInterval(() => {
  const removed = manager.sweep()
  if (removed) console.log(`Salas abandonadas eliminadas: ${removed}`)
}, 5 * 60_000).unref()

server.listen(PORT, () => {
  console.log(`Planta IoT escuchando en http://localhost:${PORT}  (WebSocket en /ws)`)
})
