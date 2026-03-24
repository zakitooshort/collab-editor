type MessageHandler = (data: unknown) => void
type StatusHandler = () => void

interface WSClientOptions {
  url: string
  onMessage: MessageHandler
  onOpen?: StatusHandler
  onClose?: StatusHandler
}

const INITIAL_BACKOFF_MS = 500
const MAX_BACKOFF_MS = 30_000

// websocket wrapper with auto reconnect
// messages sent while disconnected get queued and flushed once we're back
export class WSClient {
  private url: string
  private onMessage: MessageHandler
  private onOpen?: StatusHandler
  private onClose?: StatusHandler

  private ws: WebSocket | null = null
  private queue: string[] = []
  private backoff = INITIAL_BACKOFF_MS
  private destroyed = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(opts: WSClientOptions) {
    this.url = opts.url
    this.onMessage = opts.onMessage
    this.onOpen = opts.onOpen
    this.onClose = opts.onClose
    this.connect()
  }

  private connect(): void {
    if (this.destroyed) return

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.backoff = INITIAL_BACKOFF_MS
      this.onOpen?.()
      // send anything that piled up while we were offline
      const queued = this.queue.splice(0)
      for (const msg of queued) {
        this.ws!.send(msg)
      }
    }

    this.ws.onmessage = (event) => {
      try {
        this.onMessage(JSON.parse(event.data as string))
      } catch {
        // bad json, skip it
      }
    }

    this.ws.onclose = () => {
      this.onClose?.()
      if (!this.destroyed) this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS)
      this.connect()
    }, this.backoff)
  }

  send(message: unknown): void {
    const payload = JSON.stringify(message)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload)
    } else {
      this.queue.push(payload)
    }
  }

  destroy(): void {
    this.destroyed = true
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer)
    this.ws?.close()
  }
}
