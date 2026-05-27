# BestBank — Starting the App

This project has two separate processes that must both be running: a **backend API server** and a **frontend dev server**.

---

## 1. Backend (Express + MongoDB)

**Directory:** `bestbank_be/`

**Command:**
```bash
npx tsx src/server.ts
```

**What it does:**
- `tsx` is a TypeScript runner — it compiles and executes `server.ts` on the fly without a build step.
- Loads environment variables from `.env` (including `MONGO_URI` for the MongoDB connection).
- Connects to MongoDB via Mongoose.
- Starts an Express HTTP server on **port 3000**.

**Routes exposed:**
| Prefix | Router |
|---|---|
| `/api/auth` | Authentication (login, register, etc.) |
| `/api/account` | Account management |
| `/api/transactions` | Transaction history and transfers |

Make sure your `.env` file exists in `bestbank_be/` and contains a valid `MONGO_URI` before starting.

---

## 2. Frontend (React + Vite)

**Directory:** `bestbank_fe/`

**Command:**
```bash
cd /home/adir/git/fs/bestbank_fe && npm run dev -- --host
```

**What it does:**
- `vite` starts a development server with hot module reload (HMR) — changes to source files appear in the browser instantly.
- The `--host` flag binds to `0.0.0.0` instead of `127.0.0.1`, making the site reachable from **any device on your local network** (e.g. your phone or another laptop on the same WiFi).
- Vite proxies any request to `/api/*` to `http://localhost:3000`, so the frontend and backend talk to each other seamlessly without CORS issues.

**Access URLs printed on startup:**
| URL | Who can use it |
|---|---|
| `http://localhost:5173` | Your machine only |
| `http://192.168.1.156:5173` | Any device on the same WiFi |

---

## Startup Order

Start the **backend first**, then the **frontend**. The frontend doesn't depend on the backend being up to load, but API calls will fail until the backend is running and MongoDB is connected.

```
Terminal 1 (backend):
  cd bestbank_be
  npx tsx src/server.ts

Terminal 2 (frontend):
  cd bestbank_fe
  npm run dev -- --host
```
