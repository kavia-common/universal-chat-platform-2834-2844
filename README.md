# universal-chat-platform-2834-2844

This workspace contains the chat_frontend React app.

To integrate with a backend that proxies Playwright MCP:
- Configure environment variables in the frontend:
  - REACT_APP_API_URL (e.g., http://localhost:4000/api)
  - REACT_APP_WS_URL (e.g., ws://localhost:4000/ws)
- Implement REST/WS endpoints in your backend that forward to MCP.

See chat_frontend/README.md for details.