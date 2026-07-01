/**
 * Vitest global setup — runs before every test file.
 *
 * Problem: @supabase/realtime-js requires a WebSocket constructor at the
 * moment the SupabaseClient is instantiated.  Node.js 22+ has a native
 * WebSocket, but CI may run Node.js 20 where it is absent.  Providing a
 * minimal no-op stub satisfies the check without making real connections.
 */

class MockWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2
  readonly CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  url = ''
  protocol = ''
  binaryType: BinaryType = 'blob'
  bufferedAmount = 0
  extensions = ''

  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null

  private _listeners: Map<string, Set<EventListener>> = new Map()

  constructor(_url: string, _protocols?: string | string[]) {
    this.url = typeof _url === 'string' ? _url : ''
  }

  close(_code?: number, _reason?: string): void {
    this.readyState = MockWebSocket.CLOSED
  }

  send(_data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    // no-op in tests
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set())
    this._listeners.get(type)!.add(listener)
  }

  removeEventListener(type: string, listener: EventListener): void {
    this._listeners.get(type)?.delete(listener)
  }

  dispatchEvent(_event: Event): boolean {
    return true
  }
}

// Only polyfill when the runtime lacks a native WebSocket (Node.js < 22).
if (typeof globalThis.WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).WebSocket = MockWebSocket
}
