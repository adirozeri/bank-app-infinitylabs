# Docker Guide

## Running Locally

**Build and start (first time or after code changes):**
```bash
docker-compose up --build
```

**Start without rebuilding:**
```bash
docker-compose up
```

**Run in background:**
```bash
docker-compose up -d
```

**Stop:**
```bash
docker-compose down
```

**View logs (when running in background):**
```bash
docker-compose logs -f
```

Once running, the server is available at `http://localhost:3000`.

---

## Deploying to a Server

### Files to copy

```
BankingApp/
├── src/
├── package.json
├── package-lock.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── .env
```

**Do NOT copy:**
- `node_modules/` — will be reinstalled inside Docker
- `docs/` — not needed for running the app

### Copying files to the server

**Option 1 — scp:**
```bash
scp -r BankingApp/ user@your-server-ip:/path/to/destination
```

**Option 2 — git:**
Push the code to GitHub and clone it on the server (make sure `.env` is in `.gitignore` and create it manually on the server):
```bash
git clone <your-repo-url>
```

### Starting the server

Make sure Docker is installed on the server, then run:
```bash
docker-compose up --build -d
```

Docker handles everything — installing Node, dependencies, and starting the server.
