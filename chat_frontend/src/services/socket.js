//
// Reusable WebSocket client for the chat frontend.
//
// This connects to a backend WebSocket endpoint that should proxy real-time
// events from a Playwright MCP Server (e.g., streaming tool outputs, tokens,
// or new messages). The browser doesn't connect directly to MCP.
//
// Environment:
// - REACT_APP_WS_URL: WebSocket URL (e.g., wss://api.example.com/ws)
//   If not set, it will default to `${location.origin.replace('http','ws')}/ws`.
//

const DEFAULT_WS_PATH = "/ws";

// PUBLIC_INTERFACE
export class SocketClient {
  /**
   * Create a new Socket client.
   * @param {Object} options
   * @param {string} [options.url] - Full WS URL like wss://host/ws
   * @param {(msg: any) => void} [options.onMessage] - Message callback
   * @param {() => void} [options.onOpen] - Open callback
   * @param {(ev?: CloseEvent) => void} [options.onClose] - Close callback
   * @param {(err?: Event) => void} [options.onError] - Error callback
   * @param {() => Promise<string>|string} [options.getAuthToken] - optional bearer token provider
   * @param {boolean} [options.autoReconnect] - enable auto-reconnect
   * @param {number} [options.reconnectDelayMs] - initial reconnect delay
   */
  constructor({
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    getAuthToken,
    autoReconnect = true,
    reconnectDelayMs = 1000,
  } = {}) {
    const envUrl =
      typeof process !== "undefined" &&
      process.env &&
      process.env.REACT_APP_WS_URL
        ? process.env.REACT_APP_WS_URL
        : null;

    if (url) {
      this.url = url;
    } else if (envUrl) {
      this.url = envUrl;
    } else if (typeof window !== "undefined") {
      const wsBase = window.location.origin.replace(/^http/i, "ws");
      this.url = wsBase + DEFAULT_WS_PATH;
    } else {
      this.url = DEFAULT_WS_PATH; // fallback
    }

    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;
    this.getAuthToken = getAuthToken;

    this.autoReconnect = autoReconnect;
    this.reconnectDelayMs = reconnectDelayMs;
    this._ws = null;
    this._reconnectTimer = null;
    this._closedExplicitly = false;
  }

  // PUBLIC_INTERFACE
  async connect() {
    /**
     * Connects to the WebSocket endpoint and sets up listeners.
     * Backend is expected to authenticate via cookies or via Authorization header
     * using a subprotocol/token query if supported by your server.
     */
    this._closedExplicitly = false;

    // Build URL with optional token parameter if needed.
    let url = this.url;
    const token =
      typeof this.getAuthToken === "function"
        ? await this.getAuthToken()
        : this.getAuthToken;
    if (token) {
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}auth=${encodeURIComponent(token)}`;
    }

    this._ws = new WebSocket(url);
    this._ws.onopen = () => {
      this.onOpen && this.onOpen();
    };
    this._ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        this.onMessage && this.onMessage(data);
      } catch {
        // Allow plain text messages too.
        this.onMessage && this.onMessage(evt.data);
      }
    };
    this._ws.onerror = (err) => {
      this.onError && this.onError(err);
    };
    this._ws.onclose = (ev) => {
      this.onClose && this.onClose(ev);
      this._ws = null;
      if (!this._closedExplicitly && this.autoReconnect) {
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = setTimeout(
          () => this.connect(),
          this.reconnectDelayMs
        );
        // Exponential backoff with a cap
        this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, 15000);
      }
    };
  }

  // PUBLIC_INTERFACE
  send(objOrString) {
    /**
     * Sends a message to the backend WS. Accepts object (auto-JSON) or string.
     * Typical usage: send({ type: 'message', roomId, content })
     */
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return false;
    const payload =
      typeof objOrString === "string"
        ? objOrString
        : JSON.stringify(objOrString);
    this._ws.send(payload);
    return true;
  }

  // PUBLIC_INTERFACE
  disconnect() {
    /**
     * Closes the WS connection and disables auto-reconnect for this instance.
     */
    this._closedExplicitly = true;
    clearTimeout(this._reconnectTimer);
    if (this._ws) {
      try {
        this._ws.close();
      } catch {
        // ignore
      }
    }
    this._ws = null;
  }
}

export default SocketClient;
