import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import api, { ApiClient } from "./services/api";
import SocketClient from "./services/socket";

/**
 * Theme and utility
 */
const OceanTheme = {
  primary: "#2563EB",
  secondary: "#F59E0B",
  success: "#F59E0B",
  error: "#EF4444",
  background: "#f9fafb",
  surface: "#ffffff",
  text: "#111827",
};

// PUBLIC_INTERFACE
export function applyThemeVars(theme = OceanTheme) {
  /** Apply CSS variables at runtime (optional override from env in future). */
  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.primary);
  root.style.setProperty("--color-secondary", theme.secondary);
  root.style.setProperty("--color-success", theme.success);
  root.style.setProperty("--color-error", theme.error);
  root.style.setProperty("--color-bg", theme.background);
  root.style.setProperty("--color-surface", theme.surface);
  root.style.setProperty("--color-text", theme.text);
}

/**
 * Local mocks (fallback) - retained for developer convenience when no backend is configured.
 * If REACT_APP_API_URL/REACT_APP_WS_URL are provided, the app will use real clients.
 */
const createMockRooms = () => ([
  { id: "general", name: "General", unread: 2 },
  { id: "guides", name: "Guides", unread: 0 },
  { id: "dev", name: "Developers", unread: 5 },
  { id: "random", name: "Random", unread: 0 },
]);

const createMockUsers = () => ([
  { id: "u1", name: "Ava", online: true },
  { id: "u2", name: "Noah", online: true },
  { id: "u3", name: "Mia", online: false },
  { id: "u4", name: "Liam", online: true },
]);

/** In-memory message store per room for the mock backend. */
const mockMessageStore = {
  general: [
    { id: uuidv4(), roomId: "general", author: "Ava", me:false, content: "Welcome to General 👋", ts: new Date() },
    { id: uuidv4(), roomId: "general", author: "You", me:true, content: "Hi everyone!", ts: new Date() },
  ],
  guides: [
    { id: uuidv4(), roomId: "guides", author: "Noah", me:false, content: "Check the docs in the sidebar.", ts: new Date() },
  ],
  dev: [
    { id: uuidv4(), roomId: "dev", author: "Liam", me:false, content: "Ship it! 🚢", ts: new Date() },
  ],
  random: []
};

// Fallback mock REST when no API base url provided
const MockRest = {
  async listRooms() {
    await sleep(200);
    return createMockRooms();
  },
  async listUsers() {
    await sleep(200);
    return createMockUsers();
  },
  async getMessages(roomId) {
    await sleep(150);
    return (mockMessageStore[roomId] || []).slice(-200);
  },
  async sendMessage(roomId, content) {
    await sleep(120);
    const msg = { id: uuidv4(), roomId, author: "You", me: true, content, ts: new Date() };
    mockMessageStore[roomId] = [...(mockMessageStore[roomId] || []), msg];
    return msg;
  }
};

// Fallback mock socket for local demo
class MockSocket {
  constructor(onMessage) {
    this.onMessage = onMessage;
    this._interval = null;
  }
  connect() {
    this._interval = setInterval(() => {
      const rooms = Object.keys(mockMessageStore);
      const roomId = rooms[Math.floor(Math.random() * rooms.length)];
      const names = ["Ava", "Noah", "Mia", "Liam"];
      const author = names[Math.floor(Math.random() * names.length)];
      const contentChoices = [
        "This looks great!",
        "Ocean vibes 🌊",
        "Let's deploy later today.",
        "Ping me if you need help.",
        "Working on the UI polish.",
      ];
      const content = contentChoices[Math.floor(Math.random() * contentChoices.length)];
      const msg = { id: uuidv4(), roomId, author, me: false, content, ts: new Date() };
      mockMessageStore[roomId] = [...(mockMessageStore[roomId] || []), msg];
      this.onMessage?.(msg);
    }, 6500);
  }
  disconnect() {
    if (this._interval) clearInterval(this._interval);
  }
}

/** helpers */
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * UI Components
 */

// PUBLIC_INTERFACE
function Header({ onNewChat }) {
  /** Header bar with brand and actions. */
  return (
    <header className="header" role="banner">
      <div className="brand" aria-label="App Brand">
        <div className="brand__logo" />
        <div className="brand__name">Ocean Chat</div>
      </div>
      <div className="header__actions">
        <button className="btn btn--ghost" onClick={onNewChat} aria-label="Start new chat">
          + New
        </button>
        <button className="btn btn--primary" aria-label="Profile">
          Profile
        </button>
      </div>
    </header>
  );
}

// PUBLIC_INTERFACE
function Sidebar({ rooms, activeRoomId, onSelectRoom, users }) {
  /** Sidebar showing rooms and users with a search input. */
  const [query, setQuery] = useState("");
  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(r => r.name.toLowerCase().includes(q));
  }, [rooms, query]);

  return (
    <aside className="sidebar" aria-label="Sidebar with rooms and users">
      <div className="sidebar__section">Rooms</div>
      <div className="search">
        <input
          type="search"
          placeholder="Search rooms..."
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
          aria-label="Search rooms"
        />
      </div>
      <div className="room-list" role="list">
        {filteredRooms.map(room => (
          <div
            key={room.id}
            className={`list-item ${room.id === activeRoomId ? "active" : ""}`}
            onClick={() => onSelectRoom(room.id)}
            role="listitem"
            tabIndex={0}
            onKeyDown={(e)=> e.key === "Enter" && onSelectRoom(room.id)}
            aria-label={`Open room ${room.name}`}
          >
            <div className="avatar" aria-hidden />
            <div>
              <div style={{ fontWeight: 700 }}>{room.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {room.unread ? `${room.unread} unread` : "No unread"}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar__section">Online</div>
      <div className="user-list" role="list">
        {users.map(u => (
          <div key={u.id} className="list-item" role="listitem" aria-label={`${u.name} ${u.online ? "online" : "offline"}`}>
            <div className="avatar" aria-hidden />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>{u.name}</span>
              {u.online ? (
                <span style={{ width: 8, height: 8, background: "#10B981", borderRadius: 999 }} aria-label="online" />
              ) : (
                <span style={{ width: 8, height: 8, background: "#9CA3AF", borderRadius: 999 }} aria-label="offline" />
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

// PUBLIC_INTERFACE
function ChatHeader({ title }) {
  /** Chat header showing room title and connection status. */
  return (
    <div className="chat__header" role="group" aria-label="Chat header">
      <div className="chat__meta">
        <span className="status-dot" aria-label="connected" />
        <div className="chat__title">{title}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" aria-label="Call">Call</button>
        <button className="btn" aria-label="More">More</button>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function MessageList({ messages, myName = "You" }) {
  /** Scrollable list of messages. Auto-scrolls to bottom on updates. */
  const scrollerRef = useRef(null);

  useEffect(() => {
    const node = scrollerRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  return (
    <div className="chat__messages" ref={scrollerRef} role="log" aria-live="polite">
      {messages.map(m => (
        <div className="message" key={m.id}>
          <div className="avatar" aria-hidden />
          <div className={`bubble ${m.me ? "bubble--me" : ""}`}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{m.me ? myName : m.author}</div>
            <div>{m.content}</div>
            <div className="msg-meta">
              <span>{format(new Date(m.ts), "HH:mm")}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// PUBLIC_INTERFACE
function ChatComposer({ value, setValue, onSend, disabled }) {
  /** Message composer with toolbar and send button. */
  const taRef = useRef(null);
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = `${Math.min(160, taRef.current.scrollHeight)}px`;
    }
  }, [value]);

  return (
    <div className="composer" aria-label="Message composer">
      <div className="composer__row">
        <div className="input-wrap">
          <textarea
            ref={taRef}
            className="input"
            placeholder="Write a message..."
            value={value}
            onChange={(e)=>setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-label="Type your message"
          />
          <div className="toolbar">
            <button className="icon-btn" title="Attach" aria-label="Attach">📎</button>
            <button className="icon-btn" title="Emoji" aria-label="Emoji">😊</button>
            <button className="icon-btn" title="Mic" aria-label="Voice">🎤</button>
          </div>
        </div>
        <button className="send-btn" onClick={onSend} disabled={disabled || !value.trim()} aria-label="Send message">
          ➤ Send
        </button>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function ChatPane({ room, messages, onSendMessage }) {
  /** Combines chat header, messages list, and composer. */
  const [draft, setDraft] = useState("");
  return (
    <section className="chat" aria-label="Chat panel">
      <ChatHeader title={room?.name || "Select a room"} />
      <MessageList messages={messages} />
      <ChatComposer
        value={draft}
        setValue={setDraft}
        onSend={() => {
          const text = draft.trim();
          if (!text) return;
          onSendMessage(text);
          setDraft("");
        }}
        disabled={!room}
      />
    </section>
  );
}

/**
 * Decide which transport to use based on env:
 * - If REACT_APP_API_URL is set, use real ApiClient (backend should proxy to Playwright MCP).
 * - If REACT_APP_WS_URL is set, use real SocketClient for realtime updates (backend proxies MCP events).
 * - Otherwise, fall back to in-memory mocks for local demo.
 */
function App() {
  /** Root app composing header, sidebar, and chat pane. */
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState("general");
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);

  const isRealApi =
    typeof process !== "undefined" &&
    process.env &&
    !!process.env.REACT_APP_API_URL;

  const isRealWs =
    typeof process !== "undefined" &&
    process.env &&
    !!process.env.REACT_APP_WS_URL;

  // Select the API client instance
  const apiClient = useMemo(() => {
    if (isRealApi) {
      // In real deployments, the backend should expose endpoints that translate to
      // Playwright MCP operations (e.g., list rooms/sessions, fetch/send messages).
      return api;
    }
    // Fallback to mock for local dev without backend
    return {
      listRooms: MockRest.listRooms,
      listUsers: MockRest.listUsers,
      getMessages: MockRest.getMessages,
      sendMessage: MockRest.sendMessage,
    };
  }, [isRealApi]);

  useEffect(() => {
    applyThemeVars(OceanTheme);
  }, []);

  useEffect(() => {
    // initial data load
    (async () => {
      try {
        const [r, u] = await Promise.all([apiClient.listRooms(), apiClient.listUsers()]);
        setRooms(Array.isArray(r) ? r : []);
        setUsers(Array.isArray(u) ? u : []);
      } catch (e) {
        console.error("Failed to load initial data:", e);
        // Ensure UI still renders
        setRooms([]);
        setUsers([]);
      }
    })();
  }, [apiClient]);

  useEffect(() => {
    // load room messages
    if (!activeRoomId) return;
    (async () => {
      try {
        const msgs = await apiClient.getMessages(activeRoomId);
        setMessages(Array.isArray(msgs) ? msgs : []);
      } catch (e) {
        console.error("Failed to load messages:", e);
        setMessages([]);
      }
    })();
  }, [activeRoomId, apiClient]);

  useEffect(() => {
    // Connect to real socket if configured, else use mock socket
    const handleIncoming = (incoming) => {
      if (!incoming) return;
      // Expected shape from backend: { id, roomId, author, me?, content, ts }
      if (incoming.roomId === activeRoomId) {
        setMessages((prev) => [...prev, { ...incoming, ts: incoming.ts ? incoming.ts : new Date() }]);
      }
    };

    let s;
    if (isRealWs) {
      // Real socket: backend should forward MCP streaming events as messages
      s = new SocketClient({
        onMessage: handleIncoming,
      });
      s.connect();
    } else {
      // Mock socket: local periodic demo messages
      s = new MockSocket(handleIncoming);
      s.connect();
    }
    setSocket(s);
    return () => s && s.disconnect();
  }, [activeRoomId, isRealWs]);

  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === activeRoomId),
    [rooms, activeRoomId]
  );

  const handleSend = async (text) => {
    try {
      // In real mode, this POST goes to backend, which sends to MCP
      const saved = await apiClient.sendMessage(activeRoomId, text);
      setMessages((prev) => [...prev, saved]);
      // Optionally, also emit over WS if your backend expects client->WS (depends on your design)
      // socket?.send({ type: "message", roomId: activeRoomId, content: text });
    } catch (e) {
      console.error("Failed to send:", e);
      alert("Failed to send message. Check console.");
    }
  };

  return (
    <div className="app">
      <Header onNewChat={() => alert("Starting a new chat (demo)...")} />
      <main className="layout" role="main">
        <Sidebar
          rooms={rooms}
          activeRoomId={activeRoomId}
          onSelectRoom={setActiveRoomId}
          users={users}
        />
        <ChatPane
          room={activeRoom}
          messages={messages}
          onSendMessage={handleSend}
        />
      </main>
    </div>
  );
}

export default App;
