# School OS (Production-Structured ERP + AI)

School OS is a modular School ERP platform with AI integration designed for real-school workflows.

## Stack
- Backend: Node.js, Express.js, PostgreSQL, JWT, RBAC, bcrypt, dotenv
- Frontend: Next.js (App Router), responsive role-based portal
- AI: OpenAI API integration + fallback responses

## Folder Structure
```
school-os/
 ├── backend/
 │    ├── routes/
 │    ├── middleware/
 │    ├── controllers/
 │    ├── services/
 │    ├── sql/schema.sql
 │    ├── db.js
 │    └── server.js
 ├── frontend/
 │    ├── app/
 │    ├── components/
 │    └── lib/
 └── README.md
```

## 1) Backend Setup
```bash
cd /Users/anuhyaponnapati/Downloads/school-erp-ai/school-os/backend
npm install
cp .env.example .env
# edit .env with correct DATABASE_URL and JWT_SECRET
```

### Initialize PostgreSQL schema
```bash
npm run db:init
```

### Run backend
```bash
npm run dev
```
Backend starts at: `http://localhost:8080`

## 2) Frontend Setup
```bash
cd /Users/anuhyaponnapati/Downloads/school-erp-ai/school-os/frontend
npm install
cp .env.example .env.local
npm run dev
```
Frontend starts at: `http://localhost:3000`

## 3) Authentication Notes
- Student login default (created by Admin create-student API):
  - username = admission_no
  - password = admission_no
- JWT Bearer token required for protected routes.

## 4) Core API Endpoints
Base: `http://localhost:8080/api`

### Auth
- `POST /auth/bootstrap-admin` (first-time setup only)
- `POST /auth/login`
- `GET /auth/me`

### Admin
- `POST /admin/teachers`
- `POST /admin/classes`
- `POST /admin/students`
- `POST /admin/subjects`
- `POST /admin/timetable`
- `POST /admin/announcements`
- `GET /admin/analytics`

### Teacher
- `GET /teacher/classes`
- `POST /teacher/attendance`
- `POST /teacher/marks`
- `GET /teacher/student/:student_id/progress`

### Student
- `GET /student/dashboard`

### Parent
- `GET /parent/children`

### Shared Portal
- `GET /portal/dashboard`

### AI Module (School OS Agent)
- `POST /ai/remark/:student_id`
- `POST /ai/analysis/:student_id`
- `POST /ai/circular`
- `POST /ai/teacher-suggestions`

## 5) curl Testing Examples

### First-time bootstrap admin
```bash
curl -X POST http://localhost:8080/api/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@schoolos.local","password":"admin12345"}'
```

### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin12345"}'
```

### Create class (Admin token)
```bash
curl -X POST http://localhost:8080/api/admin/classes \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"class_name":"Grade 10","section":"A","academic_year":"2026-27"}'
```

### Create student (default student credentials auto-set)
```bash
curl -X POST http://localhost:8080/api/admin/students \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "admission_no":"ADM1001",
    "first_name":"Aarav",
    "last_name":"Sharma",
    "gender":"Male",
    "class_id":1,
    "parent_contact":"+91-9999999999"
  }'
```

### AI remark
```bash
curl -X POST http://localhost:8080/api/ai/remark/1 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 6) Security Included
- JWT auth middleware
- Role-based access control middleware
- bcrypt password hashing
- Input validation with zod
- Helmet, CORS, rate limiting

## 7) Next Production Steps
- Add DB migrations tool (Prisma/Knex/Drizzle)
- Add audit logs + soft deletes
- Add file uploads (S3/GCS)
- Add background jobs (queues) for notifications/reports
- Add automated test suite (unit + integration)
