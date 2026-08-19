# full_wsf_pract

Professional summary, structure, and usage guide for the WSF practice application.

## Project Overview

`full_wsf_pract` is a full-stack demonstration app combining an Express/MongoDB backend with a React + Vite frontend. It provides attendance and member management features with role-based authentication (user / admin) and audit logging for administrative actions.

Core capabilities

- User authentication (JWT) with `admin` and `user` roles
- Admin-only audit trail that records actions (create, update, delete, login)
- CRUD for members and attendance marking and reporting
- Simple admin UI guards on the frontend

## High-level Architecture

```mermaid
flowchart TB
  A[Frontend (Vite + React)] -->|API calls| B[Backend (Express API)]
  B --> C[MongoDB]
  B --> D[AuditLog Collection]
  A -->|Uses| E[AuthContext (localStorage + token)]
  subgraph Frontend
    A
    E
  end
  subgraph Backend
    B
    D
    C
  end
```

## Project Tree (key files)

Root layout (truncated):

```
full_wsf_pract/
├─ backend/
│  ├─ server.js                # Express app, routes mounting, Mongo connection
│  ├─ package.json
│  ├─ controllers/
│  │  ├─ authController.js     # login / register, JWT creation, audit logging
│  │  ├─ auditController.js    # admin audit fetch
│  │  └─ attendanceController.js
│  ├─ models/
│  │  ├─ User.js               # email, password (hashed), role
│  │  └─ AuditLog.js
│  ├─ routes/
│  │  ├─ authRoutes.js         # /api/auth
│  │  └─ auditRoutes.js        # /api/audit (verifyAdmin)
│  ├─ middleware/
│  │  └─ verifyToken.js        # verifyToken + verifyAdmin
│  └─ utils/
│     └─ auditLogger.js        # helper to write audit entries
└─ frontend/
   ├─ package.json
   ├─ src/
   │  ├─ api/apiClient.js      # fetch wrapper and service methods
   │  ├─ contexts/AuthContext.jsx
   │  ├─ components/
   │  │  ├─ Header.jsx          # navigation + admin badge
   │  │  └─ AdminRoute.jsx      # admin route guard
   │  └─ pages/
   │     ├─ Login.jsx
   │     └─ ZonalAuditHistory.jsx
```

## Features & Actions

- Authentication
  - Register: `POST /api/auth/register` (first user can be initialized as admin)
  - Login: `POST /api/auth/login` (returns `user` and `token`)
- Authorization
  - JWT stored in `wsf_token` and user object in `wsf_user` (localStorage)
  - Backend middleware `verifyToken` and `verifyAdmin` protect sensitive routes
- Audit logging
  - `logAudit()` helper records actor, action, resource, details and IP
  - Admins can fetch logs via `/api/audit`
- Frontend
  - `AdminRoute` wraps admin-only UI
  - `Header` shows an `Admin` badge when signed-in user is admin

## Quickstart (local development)

Prerequisites

- Node.js (>= 18 recommended)
- MongoDB running locally (default: `mongodb://127.0.0.1:27017/wsf_pract`)

Backend

```powershell
cd backend
npm install
cp .env.example .env      # edit if you need custom values
npm run dev               # starts server via nodemon on port 5000
```

Frontend

```powershell
cd frontend
npm install
npm run dev               # starts Vite dev server (default 5173/5174)
```

Open the app at the Vite dev URL (e.g. http://localhost:5173) and the backend will be available at `http://localhost:5000/api`.

## Test credentials

You can use these seeded accounts for testing:

- Admin: `admin@example.com` / `Admin@1234`
- User: `user@example.com` / `User@1234`

These accounts are created by the included `seed-users.mjs` script or were seeded during development.

## Important Endpoints

- `POST /api/auth/register` — register a new user
- `POST /api/auth/login` — login and receive JWT
- `GET /api/audit` — admin-only: list audit logs

## Deployment notes

- Ensure `JWT_SECRET` and `MONGO_URI` are set in production environment variables.
- Configure `CLIENT_URL` to the real frontend host so CORS restricts origins.

## Troubleshooting

- If the frontend shows `Failed to fetch` on login:
  1. Confirm backend is running: `http://localhost:5000/api/health`
  2. Confirm `VITE_API_URL` (frontend) points to `http://localhost:5000/api` or leave default.
  3. Verify CORS origins in `backend/server.js` match the Vite dev origin.

## Next improvements (suggestions)

- Show a dedicated admin dashboard or auto-redirect admins after login
- Add role management UI for admin to promote/demote users
- Add pagination and filtering for audit logs and export capability

---

If you want, I can extend the README with more diagrams (sequence diagrams for login/audit flows) or add a short CONTRIBUTING section with development workflows and linting commands.
