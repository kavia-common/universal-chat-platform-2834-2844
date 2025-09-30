//
// Reusable REST API client for the chat frontend.
//
// This client is intended to communicate with a backend service that proxies
// requests to a Playwright MCP Server. Direct browser-to-MCP access is not
// possible/practical (security, CORS, auth, protocol), so the backend must
// expose HTTP endpoints that translate to MCP calls.
//
// Environment:
// - REACT_APP_API_URL: Base URL for the backend REST API (e.g., https://api.example.com)
//   If not set, the client will fallback to relative paths ("/api") assuming a dev proxy.
//

const DEFAULT_BASE = "/api";

// PUBLIC_INTERFACE
export class ApiClient {
  /**
   * Create a new API client.
   * @param {Object} options
   * @param {string} [options.baseUrl] - Base URL for the REST API.
   * @param {() => Promise<string>|string} [options.getAuthToken] - Optional function or string to provide bearer token.
   */
  constructor({ baseUrl, getAuthToken } = {}) {
    this.baseUrl =
      baseUrl ||
      (typeof process !== "undefined" &&
      process.env &&
      process.env.REACT_APP_API_URL
        ? process.env.REACT_APP_API_URL
        : DEFAULT_BASE);

    this.getAuthToken = getAuthToken;
  }

  // INTERNAL: build headers
  async _headers() {
    const headers = {
      "Content-Type": "application/json",
    };
    const token =
      typeof this.getAuthToken === "function"
        ? await this.getAuthToken()
        : this.getAuthToken;
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  // INTERNAL: perform fetch with error handling
  async _fetch(path, options = {}) {
    const url = this.baseUrl.replace(/\/+$/, "") + path;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(await this._headers()),
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(
        `API Error ${res.status} ${res.statusText}: ${text || "No details"}`
      );
      err.status = res.status;
      err.body = text;
      throw err;
    }
    // Try JSON, fallback to text if not JSON
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    return res.text();
  }

  /**
   * PUBLIC_INTERFACE
   * listRooms
   * Returns the list of chat rooms from backend (proxying to MCP if applicable).
   */
  async listRooms() {
    // Expected backend route: GET /api/rooms
    // Backend integrates with MCP to provide available rooms/topics
    return this._fetch("/rooms", { method: "GET" });
  }

  /**
   * PUBLIC_INTERFACE
   * listUsers
   * Returns the list of users (or agents) online.
   */
  async listUsers() {
    // Expected backend route: GET /api/users
    // Backend may translate this to MCP session/user presence if applicable.
    return this._fetch("/users", { method: "GET" });
  }

  /**
   * PUBLIC_INTERFACE
   * getMessages
   * Returns messages for a given room.
   * @param {string} roomId
   */
  async getMessages(roomId) {
    // Expected backend route: GET /api/rooms/:roomId/messages
    return this._fetch(`/rooms/${encodeURIComponent(roomId)}/messages`, {
      method: "GET",
    });
  }

  /**
   * PUBLIC_INTERFACE
   * sendMessage
   * Sends a message to a given room.
   * @param {string} roomId
   * @param {string} content
   */
  async sendMessage(roomId, content) {
    // Expected backend route: POST /api/rooms/:roomId/messages
    // Body: { content }
    // Backend should forward this to MCP tooling/LLM as needed.
    return this._fetch(`/rooms/${encodeURIComponent(roomId)}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }
}

// Default singleton with env-based config
const api = new ApiClient({
  baseUrl:
    typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL
      : DEFAULT_BASE,
  // getAuthToken: async () => localStorage.getItem("token") // Example: plug auth if needed
});

export default api;
