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
- Mocked REST and WebSocket services included; easily swap with real APIs

## Getting Started

Install dependencies and run:
- npm install
- npm start

Open http://localhost:3000 to view the app.

## Structure

- src/App.js: App shell and all UI components (Header, Sidebar, Chat, MessageList, Composer) + mock services
- src/App.css: Complete Ocean Professional theme and responsive layout
- src/index.css: Base resets

## Integrating Real Backends

Replace MockRest and MockSocket in App.js:
- MockRest: wire listRooms, listUsers, getMessages, sendMessage to your REST endpoints
- MockSocket: replace with a real WebSocket connection and forward incoming messages via onMessage callback

Ensure URLs and tokens come from environment variables (e.g., REACT_APP_API_URL, REACT_APP_WS_URL).

## Accessibility

- Keyboard accessible list selection and send on Enter (Shift+Enter for newline)
- ARIA labels for key UI sections and interactive controls

## License

MIT
