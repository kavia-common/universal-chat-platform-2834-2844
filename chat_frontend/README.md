# Ocean Chat Frontend

A modern, responsive chat UI built with React that adapts across desktop and mobile, themed with the “Ocean Professional” style.

## Highlights

- Responsive layout: header, sidebar (rooms + users), chat area with messages, and bottom composer
- Smooth transitions, subtle gradients, rounded corners, and soft shadows
- Themed with Ocean Professional palette:
  - Primary: #2563EB
  - Secondary/Success: #F59E0B
  - Error: #EF4444
  - Background: #f9fafb, Surface: #ffffff, Text: #111827
- Real API integration supported via env variables; fallback mocks for local dev

## Getting Started

Install dependencies and run:
- npm install
- npm start

Open http://localhost:3000 to view the app.

## Structure

- src/App.js: App shell and UI components (Header, Sidebar, Chat, MessageList, Composer) + runtime selection of real vs mock services
- src/services/api.js: Reusable REST API client (env-driven base URL)
- src/services/socket.js: Reusable WebSocket client (env-driven URL)
- src/App.css: Complete Ocean Professional theme and responsive layout
- src/index.css: Base resets

## Playwright MCP Integration (via Backend Proxy)

This frontend is designed to work with a backend service that proxies requests and real-time events to a Playwright MCP Server.

Why a backend proxy?
- Browsers should not connect directly to MCP due to authentication, CORS, and protocol concerns.
- The backend can safely hold credentials, manage sessions, and expose a clean REST/WS contract for the UI.

Expected backend responsibilities:
- REST
  - GET /api/rooms -> list rooms/sessions
  - GET /api/users -> list users/agents
  - GET /api/rooms/:roomId/messages -> fetch messages
  - POST /api/rooms/:roomId/messages -> send a message (backend forwards to MCP)
- WebSocket
  - /ws -> server emits message events in JSON form:
    { id, roomId, author, content, ts, ... } (extend as needed)

In the code:
- src/services/api.js contains comments marking where the backend integrates with MCP for each operation.
- src/services/socket.js contains comments indicating the backend should forward MCP streaming events/messages.

## Environment Variables

Set these in your environment or a .env file at the project root (create-react-app convention):
- REACT_APP_API_URL: Base URL for REST API (e.g., https://api.example.com or http://localhost:4000/api)
- REACT_APP_WS_URL: WebSocket URL (e.g., wss://api.example.com/ws or ws://localhost:4000/ws)

When these are provided, the app uses the real clients. If not provided, the app falls back to local mock data for a smooth developer experience.

Example .env:
REACT_APP_API_URL=http://localhost:4000/api
REACT_APP_WS_URL=ws://localhost:4000/ws

Note: Do not commit real secrets. If authentication is required, the ApiClient and SocketClient have hooks for adding tokens.

## Integrating Your Backend

- Ensure your backend implements the routes mentioned above and proxies to MCP accordingly.
- Adjust CORS and WS settings on the backend to allow the dev origin (http://localhost:3000 by default).
- If you need auth:
  - Provide a token function to ApiClient/SocketClient or rely on cookies.
  - Update api.js/socket.js to attach credentials (Authorization headers or cookie-based sessions).

## Accessibility

- Keyboard accessible list selection and send on Enter (Shift+Enter for newline)
- ARIA labels for key UI sections and interactive controls

## License

MIT
