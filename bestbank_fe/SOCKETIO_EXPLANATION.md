# Real-Time Notifications with Socket.IO — Full Explanation

## What Was Added and Why

The app was previously **REST-only**: every time the frontend needed data, it had to ask the server ("pull"). There was no way for the server to reach out to the frontend unprompted ("push"). This means if User B was sitting on the Dashboard while User A sent them money, User B would only see the update after manually refreshing.

Socket.IO was added to enable **real-time push notifications**: the moment a transfer completes, the backend emits an event directly to the receiver's open browser tab. The receiver sees a pop-up and their balance updates automatically.

The notification appears on **every page that requires authentication** — Dashboard and Transfer. This means no matter where the logged-in user is in the app, they will always see the Snackbar the moment money arrives in their account.

---

## Keywords You Need to Know

| Term | Meaning |
|---|---|
| **WebSocket** | A communication protocol that keeps a persistent two-way connection open between browser and server. Unlike HTTP, both sides can send messages at any time. |
| **Socket.IO** | A library built on top of WebSocket. Adds features like automatic reconnection, fallback to HTTP long-polling, rooms, and namespaces. |
| **HTTP Long-Polling** | A fallback technique: the browser sends a request and the server holds it open until it has something to send, then closes it. The browser immediately sends another. Socket.IO falls back to this if WebSocket is unavailable. |
| **Event** | A named message sent over a socket. Like a custom signal: `socket.emit('transfer:received', data)`. The other side listens with `socket.on('transfer:received', handler)`. |
| **Emit** | To send an event. The backend emits to the frontend; the frontend emits to the backend. |
| **Handshake** | The initial HTTP request that upgrades to WebSocket. Socket.IO auth middleware runs here — before any connection is established. |
| **Middleware (Socket.IO)** | A function that runs before a socket connection is accepted. Used here to verify the JWT cookie and reject unauthenticated connections. |
| **CORS** | Cross-Origin Resource Sharing. A browser security rule that blocks requests to a different origin (domain/port). Socket.IO needs explicit CORS config to allow the frontend dev server (port 5173) to connect to the backend (port 3000). |
| **`credentials: true`** | Tells the browser to include cookies in cross-origin requests/socket connections. Required because the JWT is stored in an `httpOnly` cookie. |
| **httpOnly Cookie** | A cookie the browser cannot access via JavaScript — only sent with HTTP requests. More secure than localStorage for storing tokens. |
| **JWT (JSON Web Token)** | A signed token that proves identity. The backend issues it on login; the browser sends it back with every request (including socket handshake) via the cookie. |
| **Context (React)** | A built-in React mechanism to share state across many components without manually passing props down. Used here for auth state and socket state. |
| **`useRef`** | A React hook that stores a value that persists across renders but does NOT trigger re-renders when changed. Used for the socket object — it's an imperative handle, not reactive data. |
| **`useEffect`** | A React hook that runs side effects (connecting to sockets, fetching data) after the component renders. Can re-run when specified values change. |
| **Snackbar** | A Material UI component that shows a brief, auto-dismissing pop-up notification, typically in a corner of the screen. |
| **Vite Proxy** | A dev-server feature that forwards certain URL paths to another server. Needed so the frontend's requests to `/socket.io` reach the backend at `localhost:3000`. |
| **`ws: true`** | A Vite proxy option that enables WebSocket proxying (the HTTP→WebSocket protocol upgrade). Without it, Socket.IO would silently fall back to long-polling. |
| **`http.createServer`** | Node.js built-in that creates an HTTP server. Socket.IO attaches to this server (not to Express directly) because WebSocket is a transport-layer feature, not an Express route. |

---

## Architecture Overview

```
BEFORE (REST only):
  Browser ──[HTTP request]──► Express ──► MongoDB
  Browser ◄──[HTTP response]── Express

AFTER (REST + Socket.IO):
  Browser ──[HTTP request]──► Express ──► MongoDB
  Browser ◄──[HTTP response]── Express

  Browser ◄══[WebSocket, persistent]══► Socket.IO Server
                                             │
                         when transfer completes:
                         notifyUser(receiverEmail, payload)
                                             │
                         Socket.IO ──[emit]──► Receiver's browser
```

---

## What Changed and Why — File by File

---

### 1. `bestbank_be/src/socket.ts` — New File

This is the core of the backend real-time layer.

```ts
import { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { parse as parseCookies } from 'cookie';
import { SECRET } from './middleware/auth.js';

export interface TransferNotificationPayload {
  senderEmail: string;
  amount: number;
}

const userSockets = new Map<string, Socket>();

export function initSocket(httpServer: HttpServer): void {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const cookies = parseCookies(socket.handshake.headers.cookie ?? '');
    const token = cookies['token'];
    if (!token) return next(new Error('Not authenticated'));
    jwt.verify(token, SECRET, (err, decoded) => {
      if (err || !decoded || typeof decoded === 'string')
        return next(new Error('Invalid token'));
      (socket as any).userEmail = (decoded as { email: string }).email;
      next();
    });
  });

  io.on('connection', (socket: Socket) => {
    const email: string = (socket as any).userEmail;
    userSockets.set(email, socket);
    console.log(`[socket] connected: ${email}`);
    socket.on('disconnect', () => {
      if (userSockets.get(email) === socket) userSockets.delete(email);
      console.log(`[socket] disconnected: ${email}`);
    });
  });
}

export function notifyUser(email: string, payload: TransferNotificationPayload): void {
  const socket = userSockets.get(email);
  if (socket?.connected) socket.emit('transfer:received', payload);
}
```

**Why each part:**

- **`const userSockets = new Map<string, Socket>()`** — An in-memory registry that maps `email → socket`. When money arrives for `bob@bank.com`, we look up his socket and emit directly to him. No broadcast to all users.
- **`io.use(...)` (auth middleware)** — Runs before any connection is accepted. It reads the JWT from the handshake cookie, verifies it, and attaches the email to the socket object. If the token is missing or invalid, `next(new Error(...))` rejects the connection with a 401. This ensures only logged-in users can connect.
- **`parseCookies(socket.handshake.headers.cookie)`** — Socket.IO gives access to the raw HTTP handshake headers. The `cookie` package parses the raw cookie string (e.g. `"token=abc123; other=xyz"`) into an object `{ token: "abc123" }`.
- **`userSockets.set(email, socket)` in `connection`** — When a user successfully connects, their socket is stored. The map key is their email (from the verified JWT).
- **`if (userSockets.get(email) === socket) userSockets.delete(email)`** — The identity check on disconnect prevents a race condition: if a user opens a second tab, the second connection overwrites the first in the map. When the first tab closes, we don't want to delete the second tab's entry — so we only delete if this socket is still the registered one.
- **`notifyUser()`** — Called from the transactions route after a transfer succeeds. It looks up the receiver, checks they're still connected, and emits the `transfer:received` event. If they're offline, nothing happens — the transfer still succeeded.

---

### 2. `bestbank_be/src/server.ts` — Modified

```ts
// BEFORE:
mongoose.connect(MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

// AFTER:
import { createServer } from 'http';
import { initSocket } from './socket.js';

const httpServer = createServer(app);
initSocket(httpServer);

mongoose.connect(MONGO_URI).then(() => {
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
```

**Why:** Express's `app.listen()` is a shortcut — under the hood it calls `http.createServer(app).listen()`. Socket.IO needs a reference to the underlying `http.Server` object (not the Express app) to intercept the WebSocket upgrade. By calling `createServer(app)` ourselves, we get that reference and pass it to `initSocket`.

---

### 3. `bestbank_be/src/routes/transactions.ts` — Modified

```ts
// Added import:
import { notifyUser } from '../socket.js';

// Added after res.status(200).json(...):
notifyUser(receiverEmail, { senderEmail, amount });
```

**Why:** This is the trigger point. After the transfer is committed to MongoDB and the HTTP response is sent to the sender, we notify the receiver's socket. It's placed after `res.json()` so the HTTP response is never delayed by the socket operation.

---

### 4. `bestbank_fe/vite.config.ts` — Modified

```ts
// BEFORE:
proxy: {
  '/api': 'http://localhost:3000',
}

// AFTER:
proxy: {
  '/api': 'http://localhost:3000',
  '/socket.io': {
    target: 'http://localhost:3000',
    ws: true,
    changeOrigin: true,
  },
}
```

**Why:** In development, the React app runs on port 5173 (Vite) and the backend runs on port 3000. When `socket.io-client` connects to `'/'`, it sends requests to `localhost:5173/socket.io/...`. The Vite proxy intercepts these and forwards them to `localhost:3000`. Without `ws: true`, only the initial polling HTTP requests would be forwarded — the upgrade to WebSocket would fail silently.

---

### 5. `bestbank_fe/src/context/SocketContext.tsx` — New File

```tsx
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface TransferNotification {
  senderEmail: string;
  amount: number;
}

interface SocketContextType {
  notification: TransferNotification | null;
  clearNotification: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notification, setNotification] = useState<TransferNotification | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io('/', { withCredentials: true });
    socketRef.current = socket;

    socket.on('transfer:received', (payload: TransferNotification) => setNotification(payload));
    socket.on('connect_error', (err: Error) => console.warn('[socket]', err.message));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ notification, clearNotification: () => setNotification(null) }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}
```

**Why each part:**

- **`useEffect(..., [isAuthenticated])`** — The socket lifecycle is tied to authentication. When `isAuthenticated` becomes `true` (login), a socket is created. When it becomes `false` (logout), the socket is disconnected. The cleanup function (`return () => { socket.disconnect() }`) runs when the effect re-runs or the component unmounts.
- **`io('/', { withCredentials: true })`** — Connects to the same origin as the frontend. `withCredentials: true` tells the browser to include the `httpOnly` cookie in the socket handshake — this is how the backend identifies the user.
- **`socketRef` (useRef, not useState)** — The socket object is a mutable imperative handle. Storing it in `useRef` means changing it doesn't trigger a re-render. `useState` would cause unnecessary re-renders every time the socket connects/disconnects.
- **`notification` (useState)** — This IS reactive. When the backend emits `transfer:received`, we store the payload in state. Any component using `useSocket()` will automatically re-render and see the new notification.

---

### 6. `bestbank_fe/src/App.tsx` — Modified

```tsx
// Added import:
import { SocketProvider } from './context/SocketContext';

// Modified JSX:
<AuthProvider>
  <SocketProvider>      {/* NEW */}
    <BrowserRouter>
      <Routes>...</Routes>
    </BrowserRouter>
  </SocketProvider>     {/* NEW */}
</AuthProvider>
```

**Why:** `SocketProvider` must be inside `AuthProvider` (it reads `isAuthenticated` from it) and outside `BrowserRouter` so all pages can access `useSocket()`. Wrapping at this level means the socket connection is shared across all routes — it persists when navigating from Dashboard to Transfer and back.

---

### 7. `bestbank_fe/src/pages/Dashboard.tsx` — Modified

The Dashboard does two things on notification: shows the Snackbar **and** refreshes its data (balance + transactions).

```tsx
// New imports:
import { Snackbar } from '@mui/material';   // Alert was already imported
import { useSocket } from '../context/SocketContext';

// Inside the component:
const { notification, clearNotification } = useSocket();
const [snackbarOpen, setSnackbarOpen] = useState(false);

useEffect(() => {
  if (!notification) return;
  setRefreshKey(k => k + 1);   // re-fetches balance and transactions
  setSnackbarOpen(true);
}, [notification]);

const handleSnackbarClose = (_e?: React.SyntheticEvent | Event, reason?: string) => {
  if (reason === 'clickaway') return;
  setSnackbarOpen(false);
  clearNotification();
};

// In JSX, before the closing </Box>:
<Snackbar
  open={snackbarOpen}
  autoHideDuration={5000}
  onClose={handleSnackbarClose}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
>
  <Alert onClose={handleSnackbarClose} severity="success" variant="filled" sx={{ width: '100%' }}>
    {notification && `You received $${fmt(notification.amount)} from ${notification.senderEmail}`}
  </Alert>
</Snackbar>
```

**Why each part:**

- **`useEffect(..., [notification])`** — Fires every time `notification` changes from null to a value. Two things happen: `setRefreshKey(k => k + 1)` reuses the existing refresh mechanism (already wired up to re-fetch account and transactions), and `setSnackbarOpen(true)` shows the toast.
- **`setRefreshKey` (Dashboard only)** — Only Dashboard fetches and displays balance/transaction data, so only it needs to refresh. Transfer page does not show live balance, so no refresh is needed there.
- **`if (reason === 'clickaway') return`** — MUI Snackbar calls `onClose` if the user clicks somewhere else on the page. This guard prevents accidental dismissal.
- **`clearNotification()` in close handler** — Resets the notification to `null` in `SocketContext`. This means if another transfer comes in while the Snackbar is closing, a new notification can be set and will trigger a new open.
- **`{notification && ...}`** — Guards against rendering empty text during the Snackbar's fade-out animation (it plays while `open` is false but before the component unmounts).
- **`autoHideDuration={5000}`** — Automatically dismisses after 5 seconds.
- **`anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}`** — Standard position for non-critical notifications (bottom-right), so it doesn't block the main content.

---

### 8. `bestbank_fe/src/pages/Transfer.tsx` — Modified

The Transfer page shows the Snackbar only — no data refresh needed because it doesn't display the user's balance or transaction list.

```tsx
// New imports:
import { useState, useEffect } from 'react';         // useEffect added
import { Snackbar } from '@mui/material';             // Snackbar added
import { useSocket } from '../context/SocketContext';

// fmt helper added at module level (same as Dashboard):
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Inside the component:
const { notification, clearNotification } = useSocket();
const [snackbarOpen, setSnackbarOpen] = useState(false);

useEffect(() => {
  if (!notification) return;
  setSnackbarOpen(true);          // no refreshKey here — Transfer has no data to refresh
}, [notification]);

const handleSnackbarClose = (_e?: React.SyntheticEvent | Event, reason?: string) => {
  if (reason === 'clickaway') return;
  setSnackbarOpen(false);
  clearNotification();
};

// In JSX, before the closing </Box>:
<Snackbar
  open={snackbarOpen}
  autoHideDuration={5000}
  onClose={handleSnackbarClose}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
>
  <Alert onClose={handleSnackbarClose} severity="success" variant="filled" sx={{ width: '100%' }}>
    {notification && `You received $${fmt(notification.amount)} from ${notification.senderEmail}`}
  </Alert>
</Snackbar>
```

**Why no `setRefreshKey` here:** The Transfer page only has a form — it doesn't display balance or transaction history. Refreshing data here would have no visible effect, so the call is omitted. The notification itself is enough to alert the user; they can navigate to the Dashboard to see the updated balance.

---

## Complete Data Flow

```
[User A — Transfer Page]
  fills form: receiverEmail = bob@bank.com, amount = 500
  clicks "Send Money"
    ↓
  axios.post('/api/transactions', { receiverEmail, amount })
    ↓
[Backend — POST /api/transactions]
  verifyToken middleware: reads JWT cookie, extracts senderEmail
  finds sender and receiver in MongoDB
  deducts 500 from sender, adds 500 to receiver
  saves both users
  creates Transaction record
  res.json({ message: 'Transfer successful', senderBalance: ... })
    ↓ (after HTTP response)
  notifyUser('bob@bank.com', { senderEmail: 'alice@bank.com', amount: 500 })
    ↓
[socket.ts]
  userSockets.get('bob@bank.com') → finds Bob's Socket
  socket.emit('transfer:received', { senderEmail: 'alice@bank.com', amount: 500 })
    ↓
[Browser — WebSocket channel to Bob's tab]
  socket.on('transfer:received', payload)   ← fires in SocketContext
    → setNotification({ senderEmail: 'alice@bank.com', amount: 500 })
      ↓
  IF Bob is on Dashboard:
    useEffect fires → setRefreshKey(k+1) + setSnackbarOpen(true)
    Balance card updates with new balance
    Transaction list shows the new incoming transfer
    Snackbar appears: "You received $500.00 from alice@bank.com"
    Snackbar auto-closes after 5 seconds

  IF Bob is on Transfer page:
    useEffect fires → setSnackbarOpen(true)
    Snackbar appears: "You received $500.00 from alice@bank.com"
    Snackbar auto-closes after 5 seconds
    (no data refresh — Transfer page has no balance display)
```

---

## 10 Questions and Answers

---

**Q1: Why use Socket.IO instead of plain WebSocket?**

Plain WebSocket is a browser API — it's lower level. You'd have to build reconnection logic, event naming, authentication, and rooms yourself. Socket.IO handles all of that. It also automatically falls back to HTTP long-polling if the network doesn't support WebSocket upgrades (e.g., some corporate proxies). For a project like this, Socket.IO is the right choice.

---

**Q2: Why does Socket.IO attach to `http.Server` and not directly to Express?**

Express is a request/response framework — it handles HTTP. WebSocket is a different protocol that starts as HTTP but then upgrades. The upgrade is handled at the Node.js `http.Server` level, before Express even sees it. Socket.IO hooks into the `'upgrade'` event on the `http.Server`. Express itself has no concept of WebSocket.

```
http.Server         ← Socket.IO hooks here (handles WebSocket upgrades)
    └── Express     ← handles normal HTTP requests
```

---

**Q3: Why do we need `withCredentials: true` on the client?**

The JWT is stored in an `httpOnly` cookie. By default, browsers block cookies from being sent to a different origin (the dev server is on port 5173, the backend is on port 3000 — different ports = different origins). `withCredentials: true` tells the browser: "yes, include cookies even on cross-origin requests." The backend must also have `credentials: true` in its CORS config — both sides must opt in.

---

**Q4: What happens if the receiver is not online when the transfer happens?**

Nothing. `notifyUser()` does:
```ts
const socket = userSockets.get(email);
if (socket?.connected) socket.emit('transfer:received', payload);
```
If the user is offline, `userSockets.get(email)` returns `undefined`, and the function silently exits. The transfer still succeeded — the money is in their account. They'll see it next time they open the Dashboard (it fetches fresh data on mount).

---

**Q5: Why is `socketRef` a `useRef` and not a `useState`?**

`useState` triggers a re-render every time the value changes. The socket object is imperative — we don't render it or display it. If we stored it in `useState`, connecting and disconnecting would cause unnecessary re-renders of every component inside `SocketProvider`. `useRef` stores a mutable value that persists across renders without causing re-renders.

---

**Q6: What does the Socket.IO auth middleware do, and why is it separate from Express middleware?**

The Socket.IO middleware (`io.use(...)`) runs during the socket **handshake** — the initial HTTP connection before it upgrades to WebSocket. It reads the JWT cookie, verifies it, and either calls `next()` (accept) or `next(new Error(...))` (reject). It's separate from Express middleware because Socket.IO connections don't go through Express's request pipeline — they're handled by the `http.Server` directly.

```ts
io.use((socket, next) => {
  // socket.handshake.headers.cookie is the raw cookie string from the HTTP upgrade request
  const cookies = parseCookies(socket.handshake.headers.cookie ?? '');
  const token = cookies['token'];
  if (!token) return next(new Error('Not authenticated'));
  // verify and attach email to socket, then call next()
});
```

---

**Q7: Why is `SocketProvider` placed inside `AuthProvider` but outside `BrowserRouter` in App.tsx?**

- **Inside `AuthProvider`**: `SocketProvider` calls `useAuth()` to read `isAuthenticated`. React context works by reading from the nearest parent provider — so `AuthProvider` must be an ancestor.
- **Outside `BrowserRouter`**: The socket connection should persist across page navigation. If `SocketProvider` were inside a `<Route>`, it would unmount and reconnect on every navigation. At this level, the socket stays connected for the entire session.

---

**Q8: What is the `transfer:received` event name, and can it be anything?**

Yes, it can be any string. Socket.IO events are just named messages. The convention `namespace:action` (e.g. `transfer:received`) is common because it makes events self-documenting and avoids naming collisions. Both sides must use the exact same string — the backend emits `'transfer:received'` and the frontend listens for `'transfer:received'`.

```ts
// Backend
socket.emit('transfer:received', { senderEmail, amount });

// Frontend
socket.on('transfer:received', (payload) => { ... });
```

---

**Q9: Why does `setRefreshKey(k => k + 1)` refresh the dashboard data?**

`refreshKey` is already a state variable in `Dashboard.tsx` that's listed in the `useEffect` dependency array:

```ts
useEffect(() => {
  fetch('/api/account/me')...
  fetch('/api/transactions')...
}, [isAuthenticated, navigate, refreshKey]);  // ← refreshKey here
```

When `refreshKey` changes, React re-runs that effect — re-fetching account and transactions. The Refresh button already uses this. The socket notification reuses the exact same mechanism rather than adding a new one.

---

**Q10: What happens if the same user has two browser tabs open?**

The `userSockets` Map stores one socket per email (last-writer-wins). The second tab's connection overwrites the first tab's entry in the map. When a transfer arrives, only the most recently opened tab receives the notification. Both tabs will see the updated balance if either re-fetches (e.g., one refreshed, or the refreshKey pattern fired).

A more advanced solution would use **Socket.IO rooms**:
```ts
// On connect:
socket.join(email);           // add this socket to the user's "room"

// When notifying:
io.to(email).emit('transfer:received', payload);  // all tabs receive it
```
This would notify all tabs simultaneously, but it requires keeping a reference to the `io` instance in `notifyUser` instead of a per-user socket map.

---

## Summary of All New/Changed Files

| File | Type | Reason |
|---|---|---|
| `bestbank_be/src/socket.ts` | New | Socket.IO server: auth, user map, emit helper |
| `bestbank_be/src/server.ts` | Modified | Use `http.createServer` so Socket.IO can attach |
| `bestbank_be/src/routes/transactions.ts` | Modified | Trigger notification after successful transfer |
| `bestbank_fe/vite.config.ts` | Modified | Proxy `/socket.io` path with WebSocket support |
| `bestbank_fe/src/context/SocketContext.tsx` | New | Manage socket lifecycle and expose notification state |
| `bestbank_fe/src/App.tsx` | Modified | Wrap app with `SocketProvider` |
| `bestbank_fe/src/pages/Dashboard.tsx` | Modified | Show Snackbar + auto-refresh balance/transactions on notification |
| `bestbank_fe/src/pages/Transfer.tsx` | Modified | Show Snackbar on notification (no data refresh needed) |
