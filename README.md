# WSF-AMS — Attendance & Member Management System

[![Live Demo](https://img.shields.io/badge/Live-Demo-0A66C2?style=for-the-badge\&logo=vercel)](https://wsf-ams.vercel.app)
[![Backend API](https://img.shields.io/badge/API-Render-000000?style=for-the-badge\&logo=render)](https://wsf-ams.onrender.com/api/health)
[![CI](https://img.shields.io/github/actions/workflow/status/alexemeluedev/WSF-AMS/ci.yml?branch=main\&label=CI\&logo=github)](https://github.com/alexemeluedev/WSF-AMS/actions)

**WSF-AMS (Winners Satellite Fellowship Attendance Management System)** is a full-stack web application designed to manage attendance, members, and organizational administration across **zones, districts, and cells**.

The project was built as a complete business application rather than a simple CRUD system. It includes authentication and authorization, structured organizational data, attendance workflows, reporting, audit logging, automated email communication, automated testing, CI, and cloud deployment.

## Live Application

**Frontend:**
https://wsf-ams.vercel.app

**Backend API:**
https://wsf-ams.onrender.com/api/health

The production system uses a React/Vite frontend hosted on Vercel, a Node.js/Express API hosted on Render, and MongoDB Atlas for persistent data storage.

---

## What the System Does

WSF-AMS provides an administrative platform for managing attendance and membership operations across a hierarchical organizational structure.

### Organizational Management

* Zone management
* District management
* Cell management
* Member management
* Member reclassification
* Hierarchical relationships between zones, districts, and cells

### Attendance Management

* Attendance registration by date and cell
* Attendance history
* Attendance summaries
* Turnout calculations
* Historical attendance matrix
* Monthly reporting
* Zonal reporting

### Administration

* User authentication
* Role-based access control
* Administrative user management
* Controlled user registration
* Audit history
* Audit logging for important system actions

### Communication

* Automated attendance summary email dispatch
* Resend integration for email delivery

### User Experience

* Responsive administrative dashboard
* Protected application routes
* Structured navigation
* Data tables and management interfaces
* Search, filtering, and pagination where applicable

---

## Why This Project Is Technically Significant

WSF-AMS was designed as a **real-world business management system**, with multiple related data entities and different levels of user access.

The application required coordinating:

```text
React Frontend
      |
      v
REST API
      |
      v
Express / Node.js
      |
      v
Authentication & Authorization
      |
      v
MongoDB / Mongoose
      |
      v
MongoDB Atlas
```

The project also includes automated frontend and backend testing, GitHub Actions CI, and separate cloud deployments for the frontend and backend.

---

## Technology Stack

### Frontend

* React
* Vite
* Tailwind CSS
* React Router
* Jest
* React Testing Library
* Babel

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* bcryptjs
* CORS
* Resend
* Jest
* Supertest
* MongoDB Memory Server

### DevOps & Deployment

* Git
* GitHub
* GitHub Actions
* Vercel
* Render
* MongoDB Atlas

---

## Authentication & Security

The application uses JWT-based authentication to protect private API operations.

Security-related functionality includes:

* JWT authentication
* Password hashing with bcryptjs
* Protected API routes
* Role-based access control
* Controlled user registration
* CORS configuration
* Environment-based secret management
* Separation of development and production configuration

Sensitive credentials such as database connection strings, JWT secrets, and production configuration are stored through environment variables rather than committed to the repository.

---

## Testing

Testing was treated as part of the application development process rather than an afterthought.

The project maintains separate frontend and backend test suites.

### Frontend Testing

The frontend uses:

* Jest
* React Testing Library
* Babel

Run the frontend test suite with:

```bash
cd frontend
npm test -- --runInBand
```

**Current result:**

* 15 test suites passed
* 87 tests passed

### Backend Testing

The backend API uses:

* Jest
* Supertest
* MongoDB Memory Server
  
The backend test suite covers authentication, protected API routes, CRUD operations, attendance workflows, organizational data, and administrative functionality.

Run the backend test suite with:

```bash
cd backend
npm test -- --runInBand
```

**Current result:**

* 8 test suites passed
* 137 tests passed

### Overall Test Results

| Area      | Test Suites |   Tests |
| --------- | ----------: | ------: |
| Frontend  |          15 |      87 |
| Backend   |           8 |     137 |
| **Total** |      **23** | **224** |

**224 automated tests are currently passing.**

---

## Continuous Integration

GitHub Actions is used to automate project checks when changes are pushed to the repository.

The development workflow is:

```text
Code Changes
     |
     v
GitHub
     |
     v
GitHub Actions
     |
     +------------------+
     |                  |
     v                  v
Frontend Tests     Backend Tests
     |                  |
     +--------+---------+
              |
              v
        Validation Passed
              |
              v
       Deployment Workflow
```

The project separates the frontend and backend environments while maintaining a single GitHub repository.

---

## Production Architecture

```text
                    Users
                      |
                      v
              React / Vite App
                      |
                  Vercel
                      |
                      v
               REST API Requests
                      |
                      v
             Node.js / Express
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
       JWT Auth    Business    Resend
                   Logic       Email
          |
          v
      Mongoose
          |
          v
    MongoDB Atlas
```

### Production Components

**Frontend**

React/Vite application deployed through Vercel.

**Backend**

Node.js/Express REST API deployed through Render.

**Database**

MongoDB Atlas.

**Email**

Resend integration for automated attendance summary communication.

---

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
│
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
│
├── package.json
└── README.md
```

---

## API

The backend exposes RESTful endpoints for authentication, attendance, members, zones, districts, cells, summaries, and audit operations.

### Authentication

```text
POST /api/auth/login
POST /api/auth/register
```

### Attendance

Attendance endpoints support operations for:

* Recording attendance
* Retrieving attendance
* Updating attendance
* Attendance history
* Attendance summaries

### Audit

```text
GET /api/audit
```

Additional API routes handle members, zones, districts, cells, and reporting functionality.

---

## Local Development

### Prerequisites

* Node.js 18+
* MongoDB or MongoDB Atlas
* Git

### Clone the repository

```bash
git clone https://github.com/alexemeluedev/WSF-AMS.git
cd WSF-AMS
```

### Backend

```bash
cd backend
npm install
npm run dev
```

Create the required environment configuration:

```env
JWT_SECRET=your_secure_secret
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
```

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server normally runs at:

```text
http://localhost:5173
```

Configure the frontend API URL:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Deployment

### Frontend

The React/Vite frontend is deployed on Vercel.

https://wsf-ams.vercel.app

### Backend

The Node.js/Express API is deployed on Render.

https://wsf-ams.onrender.com

### Database

Production data is stored in MongoDB Atlas.

### Health Check

The backend provides:

```text
GET /api/health
```

Production health endpoint:

https://wsf-ams.onrender.com/api/health

---

## Key Engineering Highlights

* Full-stack React and Node.js architecture
* RESTful backend API
* MongoDB data modeling with Mongoose
* JWT authentication
* Password hashing with bcryptjs
* Role-based access control
* Hierarchical zone/district/cell structure
* Member management
* Attendance workflows
* Attendance history and reporting
* Audit logging
* Automated email dispatch
* Frontend and backend automated testing
* **224 passing automated tests**
* GitHub Actions CI
* Vercel frontend deployment
* Render backend deployment
* MongoDB Atlas production database

---

## Portfolio Context

WSF-AMS is one of my more complex full-stack projects and demonstrates my ability to design and implement a complete business application across the frontend, backend, database, authentication, testing, and deployment layers.

The project is particularly focused on **business workflow design, secure API development, data relationships, automated testing, and production deployment**.

---

## License

This project is intended for portfolio and learning purposes unless otherwise specified by the owner.
