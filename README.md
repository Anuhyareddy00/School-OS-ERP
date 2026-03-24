# School OS

`School OS` is  school ERP starter with an embedded AI assistant called `OS Agent`.

Current stack:
- `web/`: Next.js app
- `api/`: FastAPI backend
- `prisma/`: PostgreSQL-ready data model

## Branding
- Product name: `School OS`
- AI assistant: `OS Agent`
- Color palette: Peach + Pink + Blue + White

## Included Now (Working Starter)
- Auth (register/login with roles)
- Admin class and student management
- Teacher attendance marking
- Timetable management (admin create/list, portal read)
- Parent portal messaging (admin/teacher outbound + portal replies)
- Fees and payments workflow (structures, collection, portal summary)
- CSV exports for student and exam data
- `OS Agent` remark analysis endpoint (MVP rule-based)
- `OS Agent` reminder creation/list endpoints
- Branded web UI with Home, Login, Admin, Teacher, Portal, OS Agent pages

## ERP Coverage Roadmap
These modules are represented in data model and roadmap scope:
- Admissions & enrollment
- Student information system
- Attendance & timetable
- Exams, marks, grading, reports
- Homework and lesson planning
- Parent portal and communications
- Fees, billing, receipts
- Staff, HR and payroll
- Library, transport, hostel
- Procurement, inventory, assets
- Analytics, compliance, exports

## Run Backend
```bash
cd api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## PostgreSQL + Prisma Setup (for persistent Phase 2 modules)
```bash
# from project root
cd prisma
npm install

# set DATABASE_URL in environment/.env before this
npx prisma migrate dev --name init
npx prisma generate
```

Then run API with `DATABASE_URL` set.  
When `DATABASE_URL` exists, these modules run on PostgreSQL/Prisma:
- Classes, subjects, students
- Timetable
- Fees and payments
- Portal messages

## Run Frontend
```bash
cd web
npm install
npm run dev
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:8000`

## First Login
1. Open `http://localhost:3000/login`
2. Register admin:
   - email: `admin@school.com`
   - password: `admin123`
3. Register parent/student users from Login page
4. Student default login is created on student admission:
   - login id: `Admission No` (or `admissionNo@schoolos.local`)
   - password: `Admission No`
5. In Admin, use `Role-Based Linking` to link student and parent emails
6. Login as admin/teacher/student and use the same shared `/portal` (role-based permissions)

## API Highlights
- `POST /agent/remarks` -> remark analysis from student context
- `POST /agent/reminders` -> create AI reminder task
- `GET /agent/reminders` -> list reminders
- `POST /admin/timetable` and `GET /admin/timetable`
- `POST /admin/fees/structures` and `POST /admin/fees/payments`
- `POST /admin/messages` and `GET /portal/my/messages`
- `GET /portal/my/timetable` and `GET /portal/my/fees`
- `POST /admin/students/link-by-email` for parent/student account linking

## Next Build Steps
1. Migrate remaining modules (attendance, exams, marks, exports, AI reports) fully to PostgreSQL
2. Add full role-specific portals (Parent/Student/Staff)
3. Replace rule-based OS Agent logic with LLM orchestration + audit logs
4. Add scheduler for automatic reminders and digest notifications
