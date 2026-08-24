# WSF-AMS: Winners Satellite Fellowship Attendance Management System

[![Live Demo](https://img.shields.io/badge/Live-Demo-0A66C2?style=for-the-badge&logo=vercel)](https://wsf-ams.vercel.app)
[![Backend API](https://img.shields.io/badge/API-Render-000000?style=for-the-badge&logo=render)](https://wsf-ams.onrender.com/api/health)
[![CI](https://img.shields.io/github/actions/workflow/status/alexemeluedev/WSF-AMS/ci.yml?branch=main&label=CI&logo=github)](https://github.com/alexemeluedev/WSF-AMS/actions)

WSF-AMS is a full-stack attendance and member management platform built to
streamline operations across zones, districts, and local cells. It provides
tools for managing members, recording attendance, generating reports, managing
administrative users, and maintaining audit records.

## Overview

- **Frontend:** React and Vite, deployed on [Vercel](https://wsf-ams.vercel.app)
- **Backend:** Node.js and Express, hosted on [Render](https://wsf-ams.onrender.com)
- **Database:** MongoDB Atlas
- **Source control:** GitHub
- **CI/CD:** GitHub Actions

## Core Features

- Hierarchical management across zones, districts, and cells
- Role-based access for administrator and standard user accounts
- Member registration and management
- Attendance registration by date and cell
- Attendance history and summaries
- Monthly and zonal reporting
- Zonal audit history
- Member reclassification
- Administrative user management
- Audit logging for important system actions
- Attendance statistics and turnout calculations
- Automated attendance summary email dispatch
- Responsive administrative dashboard

## Local Development Setup

### Prerequisites

- Node.js 18 or higher
- A MongoDB instance or MongoDB Atlas cluster
- Git

### 1. Clone the repository

```bash
git clone https://github.com/alexemeluedev/WSF-AMS.git
cd WSF-AMS
```

### 2. Install and run the backend

```bash
cd backend
npm install
npm run dev
```

Configure the backend environment variables before starting the server:

```env
JWT_SECRET=your_secure_secret
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
```

The backend runs on the configured local API port.

### 3. Install and run the frontend

Open another terminal, then run:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server normally runs at `http://localhost:5173`.
Configure the frontend API URL with
`VITE_API_URL=http://localhost:5000/api`.

## Key API Routes

### Authentication

- `POST /api/auth/login`: Authenticates a user and returns a JWT.
- `POST /api/auth/register`: Creates an administrative or user profile where permitted.

### Attendance

Attendance routes provide operations for recording, retrieving, updating, and
summarizing attendance data.

### Administrative controls

- `GET /api/audit`: Retrieves audit history for authorized users.

The backend also contains routes for members, zones, districts, cells,
attendance summaries, and other administrative operations.

## Production Configuration

Production environment variables are configured separately from the source code:

- `MONGO_URI`: MongoDB Atlas connection
- `JWT_SECRET`: JWT signing secret
- `CLIENT_URL`: Allowed frontend origin for CORS
- `VITE_API_URL`: Production backend API URL

Production secrets are configured through the respective deployment platforms
and are not committed to the repository.

## Tech Stack

### Frontend stack

- React
- Vite
- Tailwind CSS
- React Router
- Jest
- React Testing Library
- Babel

### Backend stack

- Node.js
- Express.js
- MongoDB and Mongoose
- JWT authentication
- bcryptjs
- CORS
- Jest and Supertest
- MongoDB Memory Server

### Deployment and CI

- GitHub and GitHub Actions
- Vercel
- Render
- MongoDB Atlas

## Project Structure

```text
WSF-AMS/
├── backend/
│   ├── config/
│   │   └── env.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── attendanceController.js
│   │   ├── auditController.js
│   │   ├── districtController.js
│   │   ├── memberController.js
│   │   └── zoneController.js
│   ├── middleware/
│   │   └── verifyToken.js
│   ├── models/
│   │   ├── Attendance.js
│   │   ├── AuditLog.js
│   │   ├── Cell.js
│   │   ├── District.js
│   │   ├── Member.js
│   │   ├── User.js
│   │   └── Zone.js
│   ├── routes/
│   │   ├── attendanceRoutes.js
│   │   ├── auditRoutes.js
│   │   ├── authRoutes.js
│   │   ├── districtRoutes.js
│   │   ├── memberRoutes.js
│   │   ├── summaryRoutes.js
│   │   └── zoneRoutes.js
│   ├── tests/
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── utils/
│   ├── tests/
│   ├── jest.config.js
│   ├── jest.setup.js
│   ├── vite.config.js
│   └── package.json
├── package.json
└── README.md
```

## Testing

The project uses separate test suites for the frontend and backend.

### Frontend

Frontend tests use Jest and React Testing Library.

```bash
cd frontend
npm test -- --runInBand
```

Current result: 15 test suites passed and 87 tests passed.

### Backend

Backend API tests use Jest, Supertest, and MongoDB Memory Server.

```bash
cd backend
npm test -- --runInBand
```

Current result: 8 test suites passed and 137 tests passed.

### Test summary

| Area      | Suites |   Tests |
| --------- | -----: | ------: |
| Frontend  |     15 |      87 |
| Backend   |      8 |     137 |
| **Total** | **23** | **224** |

All current tests are passing.

## Continuous Integration

GitHub Actions runs automated checks when changes are pushed to GitHub. Passing
checks can trigger deployments to Vercel for the frontend and Render for the
backend.

```text
Code changes
    |
    v
GitHub
    |
    v
GitHub Actions
    |
    +--> Tests and checks
    |
    v
  Passed
    |
    +--> Vercel: frontend deployment
    |
    +--> Render: backend deployment
```

## Production Deployment

### Deployed frontend

The React/Vite frontend is deployed on
[Vercel](https://wsf-ams.vercel.app).

### Deployed backend

The Node.js/Express API is deployed on
[Render](https://wsf-ams.onrender.com).

### Database

Production application data is stored in MongoDB Atlas.

### Backend health check

The backend exposes `GET /api/health`. The production health endpoint is
[wsf-ams.onrender.com/api/health](https://wsf-ams.onrender.com/api/health).
A successful response confirms that the backend API is running.

## Access Model

The application uses role-based access control. Administrative users can
manage system users and organizational data, while standard users are
restricted to the operations permitted by their assigned role.

User registration is controlled rather than exposed as an unrestricted public
registration process.

## Security

The application uses JWT-based authentication for protected API operations.
Security-related configuration, including JWT secrets, MongoDB credentials,
production API configuration, and other private credentials, is provided
through environment variables and should not be committed to the repository.

The backend also uses CORS configuration to control which frontend origins are
permitted to communicate with the API.

## Project Highlights

- Full-stack React and Node.js application
- MongoDB Atlas production database
- JWT authentication and role-based access
- Zone, district, cell, and member management
- Attendance registration and history
- Monthly and zonal reporting
- Audit logging
- Automated attendance summary dispatch
- Separate frontend and backend test suites
- 224 automated tests currently passing
- GitHub Actions CI
- Vercel frontend deployment
- Render backend deployment

## License

This project is intended for portfolio and learning purposes unless otherwise
specified by the owner.
