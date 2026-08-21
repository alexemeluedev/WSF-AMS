# WSF-AMS: Winners Satellite Fellowship Attendance Management System

[![Live Demo](https://img.shields.io/badge/Live-Demo-0A66C2?style=for-the-badge&logo=vercel)](https://wsf-ams.vercel.app)
[![Backend API](https://img.shields.io/badge/API-Render-000000?style=for-the-badge&logo=render)](https://wsf-ams.onrender.com/api/health)

WSF-AMS is a full-stack attendance and member management platform built to streamline operations across districts, zones, and local cells. The system helps administrators manage member records, record attendance accurately, and monitor activity through an audit trail for better accountability and reporting.

---

- **Frontend (Vite + React):** [Deployed on Vercel](https://wsf-ams.vercel.app)
- **Backend (Node.js + Express):** [Hosted on Render](https://wsf-ams.onrender.com)

---

## Core Features

- Hierarchical management across provinces, zones, districts, and cells
- Role-based access for admin and standard user accounts
- Audit logging for key actions such as login, creation, updates, and deletions
- Member registration and attendance tracking by date and cell
- Reporting for attendance summaries and operational visibility
- Clean and responsive dashboard experience for administrative workflows

---

## 🛠️ Local Development Setup

### Prerequisites

- Node.js (v18.0.0 or higher)
- MongoDB Instance (Local Community Server or MongoDB Atlas cluster)

### 1. Backend Installation

```bash
cd backend
npm install
cp .env.example .env     # Define your PORT, MONGO_URI, and JWT_SECRET
npm run dev              # Starts development server via nodemon on Port 5000
```

### 2. Frontend Installation

```bash
cd frontend
npm install
npm run dev              # Launches Vite HMR server (usually localhost:5173)
```

---

## 📡 Key API Routes

### Authentication & Security

- `POST /api/auth/register` — Provision a new profile.
- `POST /api/auth/login` — Verifies credentials and yields a signed JWT.

### Administrative Controls

- `GET /api/audit` — Extracts system logging histories _(Requires valid Admin token)_.

---

## 🔒 Production Optimization & CORS Configurations

To keep the application context secure, environmental layers are distributed across respective targets:

- `MONGO_URI` and `JWT_SECRET` are injected directly via the Render Dashboard.
- `CLIENT_URL` is set on the backend to enforce strict CORS access from the Vercel domain link exclusively.
- `VITE_API_URL` is set inside Vercel's variables to communicate directly with the live Render instance API gateway.

---

## 📦 Tech Stack

### Frontend

- React 19
- Vite
- Tailwind CSS
- React Router
- Recharts
- Jest + Testing Library

### Backend

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- bcryptjs
- CORS
- Nodemailer / Resend

---

## 🧩 Project Structure

```text
AttendanceMarkingSystem/
├─ backend/
│  ├─ app.js
│  ├─ server.js
│  ├─ package.json
│  ├─ controllers/
│  │  ├─ authController.js
│  │  ├─ memberController.js
│  │  ├─ attendanceController.js
│  │  ├─ zoneController.js
│  │  ├─ districtController.js
│  │  ├─ cellController.js
│  │  ├─ summaryController.js
│  │  └─ auditController.js
│  ├─ models/
│  │  ├─ User.js
│  │  ├─ Member.js
│  │  ├─ Attendance.js
│  │  ├─ Cell.js
│  │  ├─ Zone.js
│  │  ├─ District.js
│  │  └─ AuditLog.js
│  ├─ routes/
│  │  ├─ authRoutes.js
│  │  ├─ memberRoutes.js
│  │  ├─ attendanceRoutes.js
│  │  ├─ zoneRoutes.js
│  │  ├─ districtRoutes.js
│  │  ├─ cellRoutes.js
│  │  ├─ summaryRoutes.js
│  │  └─ auditRoutes.js
│  ├─ middleware/
│  │  └─ verifyToken.js
│  ├─ utils/
│  │  └─ auditLogger.js
│  ├─ tests/
│  └─ seed-users.mjs
├─ src/
│  ├─ App.jsx
│  ├─ api/
│  ├─ components/
│  ├─ contexts/
│  ├─ pages/
│  └─ main.jsx
├─ package.json
├─ vite.config.js
├─ .env.example
├─ jest.config.js
├─ README.md
└─ public/
```

---

## 🧪 Testing

This project uses:

- Jest and Supertest for backend API testing
- Jest and React Testing Library for frontend UI testing

Run the full test suite with:

```bash
npm test -- --runInBand
```

For backend-only tests:

```bash
cd backend
npm test
```

---

## Access Model

The application is designed for role-based access control, where administrators manage user provisioning internally. Registration is intentionally restricted to maintain a controlled operational flow for staff and team management.

---

## 📌 Project Highlights

- Secure role-based access
- member and attendance management
- zone, district, and cell organization
- audit logs for accountability
- responsive management dashboard
- live deployment-ready architecture

---

## 📄 License

This project is intended for portfolio and learning purposes unless otherwise specified by the owner.
