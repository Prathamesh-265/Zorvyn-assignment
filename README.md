# Finance Data Processing & Access Control Backend

A Node.js + Express backend for a finance dashboard system with JWT authentication, role-based access control, financial record management, and aggregated analytics.

---

## Tech Stack

| Concern       | Choice                  |
|---------------|-------------------------|
| Runtime       | Node.js                 |
| Framework     | Express 4               |
| Database      | SQLite via better-sqlite3 |
| Auth          | JWT (jsonwebtoken)      |
| Password hash | bcryptjs                |
| Validation    | express-validator       |
| API Docs      | Swagger (swagger-jsdoc + swagger-ui-express) |

---

## Project Structure

```
finance-backend/
├── src/
│   ├── config/
│   │   ├── database.js      # SQLite init + schema
│   │   └── swagger.js       # Swagger spec config
│   ├── middleware/
│   │   ├── auth.js          # JWT authenticate + authorize(role) guard
│   │   └── errorHandler.js  # Validation runner + global error handler
│   ├── routes/
│   │   ├── auth.js          # POST /login, POST /register, GET /me
│   │   ├── users.js         # CRUD for users
│   │   ├── records.js       # CRUD for financial records
│   │   └── dashboard.js     # Aggregated analytics endpoints
│   ├── services/
│   │   ├── authService.js       # login / register logic
│   │   ├── userService.js       # user CRUD + role assignment
│   │   ├── recordService.js     # financial record CRUD + filtering
│   │   └── dashboardService.js  # summary, monthly/weekly trends
│   └── utils/
│       ├── paginate.js      # Pagination helper
│       └── seed.js          # Database seeder
└── data/
    └── finance.db           # Auto-created SQLite database
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Seed the database (creates the DB and sample data)

```bash
npm run seed
```

### 3. Start the server

```bash
npm start          # production
npm run dev        # development with nodemon
```

The server starts at **http://localhost:3000**

---

## Swagger API Docs

Once the server is running, visit:

**http://localhost:3000/api/docs**

All endpoints are documented and interactive. Click **Authorize** (top right), paste a JWT token, and test every route.

---

## Seed Credentials

| Email                   | Password      | Role     |
|-------------------------|---------------|----------|
| admin@example.com       | password123   | admin    |
| analyst@example.com     | password123   | analyst  |
| viewer@example.com      | password123   | viewer   |

---

## API Overview

### Auth

| Method | Path                  | Auth   | Description                          |
|--------|-----------------------|--------|--------------------------------------|
| POST   | /api/auth/login       | None   | Login, returns JWT                   |
| POST   | /api/auth/register    | Admin  | Create a new user                    |
| GET    | /api/auth/me          | Any    | Get current user info                |

### Users

| Method | Path            | Auth   | Description                          |
|--------|-----------------|--------|--------------------------------------|
| GET    | /api/users      | Admin  | List users (pagination, filters)     |
| GET    | /api/users/:id  | Admin / Self | Get user by ID               |
| PATCH  | /api/users/:id  | Admin / Self | Update user (role only by admin) |
| DELETE | /api/users/:id  | Admin  | Soft-deactivate user                 |

### Financial Records

| Method | Path              | Auth          | Description                      |
|--------|-------------------|---------------|----------------------------------|
| GET    | /api/records      | Any           | List records (filters + paging)  |
| GET    | /api/records/:id  | Any           | Get single record                |
| POST   | /api/records      | Admin         | Create a record                  |
| PATCH  | /api/records/:id  | Admin         | Update a record                  |
| DELETE | /api/records/:id  | Admin         | Soft-delete a record             |

**Available filters for GET /api/records:**

- `type` — `income` or `expense`
- `category` — partial match
- `date_from` / `date_to` — ISO date strings (YYYY-MM-DD)
- `min_amount` / `max_amount` — numeric range
- `search` — full-text search across notes and category
- `page` / `limit` — pagination

### Dashboard Analytics

| Method | Path                              | Auth               | Description               |
|--------|-----------------------------------|--------------------|---------------------------|
| GET    | /api/dashboard/summary            | Analyst + Admin    | Income, expenses, balance, by-category |
| GET    | /api/dashboard/trends/monthly     | Analyst + Admin    | Monthly trends (by year)  |
| GET    | /api/dashboard/trends/weekly      | Analyst + Admin    | Weekly trends (last 12 wk)|

---

## Role-Based Access Control

| Action                  | Viewer | Analyst | Admin |
|-------------------------|--------|---------|-------|
| View records            | ✅     | ✅      | ✅    |
| Create/edit/delete records | ❌  | ❌      | ✅    |
| View dashboard analytics| ❌     | ✅      | ✅    |
| View user list          | ❌     | ❌      | ✅    |
| Register new users      | ❌     | ❌      | ✅    |
| Assign/change roles     | ❌     | ❌      | ✅    |
| View own profile        | ✅     | ✅      | ✅    |
| Update own name/password| ✅     | ✅      | ✅    |

RBAC is enforced via the `authorize(...roles)` middleware factory in `src/middleware/auth.js` and applied per-route.

---

## Key Design Decisions & Assumptions

**Soft deletes** — financial records are never hard-deleted. A `deleted_at` timestamp is set instead. This preserves audit trails and allows potential recovery. Users are "deactivated" (status = inactive) rather than deleted.

**Synchronous SQLite via better-sqlite3** — chosen deliberately. `better-sqlite3` is synchronous and simpler than async drivers without sacrificing correctness for a single-process dev/assessment server. All DB calls are wrapped in service functions so swapping the driver later is isolated.

**JWT stored client-side** — no session store. Tokens expire in 8 hours. For production, add token blacklisting on logout using Redis or a `revoked_tokens` table.

**Analyst cannot create/edit records** — the analyst role is read-focused. Only admins manage data integrity, matching a real finance team model where analysts consume but don't produce records.

**Viewer cannot access dashboard** — the dashboard surfaces aggregated financials which may be sensitive. Viewers only see raw (paginated) records. Promote to analyst to unlock analytics.

**Password in PATCH /api/users/:id** — users can change their own password. The new password is hashed before storage. Admins can change any user's password as well.

**Environment variable** — set `JWT_SECRET` in production:
```bash
JWT_SECRET=your_long_random_secret PORT=3000 node src/index.js
```

---

## Example: Quick curl walkthrough

```bash
# 1. Login as admin
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' | \
  node -e "process.stdin.resume();let b='';process.stdin.on('data',d=>b+=d);process.stdin.on('end',()=>console.log(JSON.parse(b).token))")

# 2. Create a record
curl -X POST http://localhost:3000/api/records \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":5000,"type":"income","category":"Salary","date":"2024-06-01","notes":"June salary"}'

# 3. Get dashboard summary (as analyst)
curl http://localhost:3000/api/dashboard/summary \
  -H "Authorization: Bearer $TOKEN"
```
