# Campus Safety Alert App

A full-stack, locally-runnable campus safety alert system. No external APIs, no OAuth, no Kubernetes.

## Architecture

| Layer | Tech |
|---|---|
| Mobile | React Native + Expo Router |
| Web Dashboard | HTML / CSS / Vanilla JS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Docker) |
| Real-time | Socket.io |
| Auth | Email + Password / bcrypt / JWT |
| Maps | Leaflet (web) + react-native-maps (mobile) |

---

## Prerequisites

- **Node.js** 18+
- **Docker** + Docker Compose
- **Expo CLI** — `npm install -g expo-cli`
- **iOS Simulator** (Xcode) or **Android Emulator**, or the Expo Go app on a physical device

---

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/sanamang/CampusSafetyApp-Protox.git
cd CampusSafetyApp-Protox
```

### 2. Start PostgreSQL + Redis + Backend via Docker

```bash
docker-compose up -d
```

This spins up:
- PostgreSQL on port **5432**
- Redis on port **6379**
- Backend API on port **3000**

> First run builds the backend Docker image (~60 sec).

### 3. Run database migration + seed

```bash
cd backend
npm install
cp ../.env.example .env    # already filled for local Docker
npm run migrate
npm run seed
```

### 4. Start the backend in dev mode (hot-reload)

```bash
cd backend
npm run dev
```

Backend is now at `http://localhost:3000`.

### 5. Start the mobile app

```bash
cd mobile
npm install
npx expo start
```

- Press **i** for iOS Simulator, **a** for Android, or scan QR with Expo Go.
- The app expects the backend at `http://localhost:3000`. If testing on a physical device, replace `localhost` in `mobile/lib/api.ts` with your machine's local IP (e.g. `192.168.1.x`).

### 6. Open the web dashboard

```bash
open web-dashboard/index.html
# or double-click it in Finder
```

No server needed — it's a static HTML file.

---

## Test Accounts

| Role | Email | Password |
|---|---|---|
| Student | `student@campus.edu` | `password123` |
| Officer | `officer@campus.edu` | `password123` |
| Admin | `admin@campus.edu` | `password123` |

---

## Simulate an Alert End-to-End

1. **Open the mobile app** and log in as `student@campus.edu`
2. **Open the web dashboard** (`web-dashboard/index.html`) and log in as `admin@campus.edu`
3. On mobile, press the big red **SOS button**
4. Watch the alert appear on the **live Leaflet map** in the dashboard, with a red pin
5. In the dashboard's **Alert Queue** tab, click **Ack** to acknowledge
6. Back on mobile, pull to refresh **History** — the status badge updates to `acknowledged`
7. Click **Resolve** in the dashboard — status becomes `resolved`

To simulate officer GPS broadcasting:
1. Log in on mobile as `officer@campus.edu`
2. The app emits location via Socket.io every 10 seconds
3. Green officer dots appear live on both the mobile Map tab and the admin dashboard map

---

## API Reference

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/logout` | Clear cookie |
| GET | `/api/auth/me` | Current user |

### Alerts
| Method | Path | Auth |
|---|---|---|
| POST | `/api/alerts` | Any logged in |
| GET | `/api/alerts` | Admin only |
| GET | `/api/alerts/mine` | Any logged in |
| GET | `/api/alerts/:id` | Any logged in |
| PATCH | `/api/alerts/:id` | Admin / Officer |
| DELETE | `/api/alerts/:id` | Admin only |

### Officers
| Method | Path | Description |
|---|---|---|
| GET | `/api/officers/nearby?lat=X&lng=Y&radius=500` | Nearby officers |
| POST | `/api/officers/location` | Officer posts GPS |

### Map
| Method | Path | Description |
|---|---|---|
| GET | `/api/map/officers` | All active officer locations |
| GET | `/api/map/alerts` | All active alert pins |

---

## Socket.io Events

| Event | Direction | Description |
|---|---|---|
| `alert:new` | Server → clients | New alert created |
| `alert:updated` | Server → clients | Alert status changed |
| `officer-location` | Client → server | Officer sends GPS |
| `officer:location` | Server → admins | Broadcast officer GPS |
| `subscribe:alert` | Client → server | Student subscribes to alert room |

---

## Project Structure

```
campus-safety-app/
├── mobile/                  # Expo React Native app
│   ├── app/
│   │   ├── (tabs)/         # Tab screens (home, map, history, profile)
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── components/          # SOSButton, AlertCard, OfficerDot
│   └── lib/api.ts           # Fetch wrapper + auth storage
├── web-dashboard/           # Static admin SPA
│   ├── index.html
│   ├── dashboard.js
│   └── styles.css
├── backend/                 # Express + TypeScript
│   ├── src/
│   │   ├── routes/          # auth, alerts, users, officers, map
│   │   ├── middleware/      # auth.ts, requireRole.ts
│   │   ├── socket/          # Socket.io setup
│   │   └── db/              # migrate.ts, seed.ts
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```
