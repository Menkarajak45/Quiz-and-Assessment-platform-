# QuizMaster — Quiz Management & Online Assessment Platform

A full-stack web app for creating and taking online quizzes, with distinct **Admin** and **Student** roles.

## Features

### Student
- Register / login / logout (JWT auth, bcrypt password hashing)
- Browse published quizzes with **search**, **category**, and **difficulty** filters
- Quiz detail page with stats (questions, time limit, total points, pass mark)
- Timed quiz-taking with **live countdown timer** and **auto-submit on expiry**
- Question palette navigation (answered/current/unanswered states)
- Single and multiple-choice questions with server-side scoring
- Instant result page with **pass/fail banner**, score %, and full **answer review** with explanations
- Attempt history with per-attempt review
- Performance dashboard with charts (score over time, performance by category)
- Global and category-filtered leaderboard

### Admin
- Platform analytics dashboard (students, quizzes, attempts, avg score, pass rate, attempts per day, top students)
- Quiz CRUD with **publish/unpublish** toggle
- Full question/option editor (single & multiple choice, points, explanations)
- Category CRUD
- Student management: create accounts, **activate/deactivate**, delete
- View all attempts with search + quiz filter
- Per-student analytics page (attempt history, stats, category performance)

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, React Hook Form, Recharts |
| Backend | Node.js, Express |
| Database | PostgreSQL 16 |
| Auth | JWT (jsonwebtoken), bcryptjs |

## Project Structure

```
├── server/                 # Express API
│   └── src/
│       ├── db/             # schema.sql, pool, setup, seed
│       ├── middleware/     # JWT auth + role guards
│       └── routes/         # auth, users, categories, quizzes, attempts, analytics
└── client/                 # React SPA
    └── src/
        ├── api/            # axios client
        ├── context/        # auth context
        ├── components/     # navbar, guards, spinner
        ├── pages/          # student + admin pages
        └── utils/          # formatting helpers
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 16 running locally (default superuser `postgres` / password `postgres`)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit `server/.env` if your PostgreSQL credentials differ:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/quizplatform
JWT_SECRET=change-me
PORT=5000
CLIENT_URL=http://localhost:5173
```

### 3. Create and seed the database
```bash
# Create the database (once)
psql -U postgres -c "CREATE DATABASE quizplatform;"

# Apply schema + seed demo data (idempotent — safe to re-run)
npm run db:setup
npm run db:seed
```

### 4. Run
```bash
# Terminal 1 — backend (http://localhost:5000)
npm run dev --workspace server

# Terminal 2 — frontend (http://localhost:5173)
npm run dev --workspace client
```

Open http://localhost:5173

### Production build
```bash
npm run build
npm start   # serves API (frontend build is static in client/dist)
```

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@quiz.com | admin123 |
| Student | alice@quiz.com | student123 |
| Student | bob@quiz.com | student123 |
| Student | chris@quiz.com | student123 |

The seed includes 5 categories, 6 quizzes (one unpublished draft), 5 students, and 13 graded attempts so dashboards, analytics, and the leaderboard are populated on first login.

## API Overview

| Method | Endpoint | Access |
|---|---|---|
| POST | /api/auth/register | public |
| POST | /api/auth/login | public |
| GET | /api/auth/me | auth |
| GET/POST | /api/categories | auth / admin |
| PUT/DELETE | /api/categories/:id | admin |
| GET/POST | /api/quizzes | auth / admin |
| GET/PUT/DELETE | /api/quizzes/:id | auth / admin |
| PATCH | /api/quizzes/:id/publish | admin |
| GET/POST | /api/users | admin |
| PATCH | /api/users/:id/status | admin |
| DELETE | /api/users/:id | admin |
| POST | /api/attempts | student |
| POST | /api/attempts/:id/submit | student (owner) |
| GET | /api/attempts/my | student |
| GET | /api/attempts | admin |
| GET | /api/attempts/:id | owner or admin |
| GET | /api/analytics/student | student / admin |
| GET | /api/analytics/platform | admin |
| GET | /api/analytics/leaderboard | auth |

## Security & Validation Notes
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with 7-day expiry; deactivated users are rejected on every request
- Role guards (`requireAdmin` / `requireStudent`) on all protected endpoints
- Server-side answer validation — option IDs are verified against the question; answers score server-side, never client-side
- IDOR protection — students can only read/submit their own attempts
- Concurrent live attempt blocked (409) per student+quiz
- Duplicate submission blocked atomically (409)
- Full input validation on auth, users, categories, quizzes, and questions payloads
