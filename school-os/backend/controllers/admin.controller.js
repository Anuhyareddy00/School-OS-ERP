import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "../db.js";

const teacherSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6)
});

const parentSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  username: z.string().min(3),
  email: z.string().email().optional(),
  password: z.string().min(6),
  phone: z.string().optional()
});

const classSchema = z.object({
  class_name: z.string().min(1),
  section: z.string().min(1),
  academic_year: z.string().min(4)
});

const classUpdateSchema = classSchema.partial();

const studentSchema = z.object({
  admission_no: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  gender: z.enum(["Male", "Female", "Other"]),
  class_id: z.number().int().positive(),
  parent_contact: z.string().min(5)
});

const studentUpdateSchema = studentSchema.partial();

const linkParentSchema = z.object({
  parent_id: z.number().int().positive(),
  student_id: z.number().int().positive()
});

const subjectSchema = z.object({
  class_id: z.number().int().positive(),
  name: z.string().min(1),
  teacher_user_id: z.number().int().positive()
});

const subjectUpdateSchema = subjectSchema.partial();

const timetableSchema = z.object({
  class_id: z.number().int().positive(),
  day_of_week: z.string().min(3),
  period_no: z.number().int().positive(),
  subject_id: z.number().int().positive(),
  teacher_id: z.number().int().positive(),
  start_time: z.string(),
  end_time: z.string()
});

const timetableUpdateSchema = timetableSchema.partial();

const announcementSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(5),
  target_role: z.enum(["ALL", "ADMIN", "TEACHER", "STUDENT", "PARENT"]).default("ALL")
});

function pagination(req) {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export async function createTeacher(req, res) {
  const payload = teacherSchema.parse(req.body);
  const hash = await bcrypt.hash(payload.password, 10);

  const role = await query(`SELECT id FROM roles WHERE code='TEACHER'`);
  const roleId = role.rows[0]?.id;

  const inserted = await query(
    `INSERT INTO users(role_id, username, email, password_hash)
     VALUES ($1,$2,$3,$4)
     RETURNING id, username, email`,
    [roleId, payload.username, payload.email, hash]
  );

  await query(
    `INSERT INTO teachers(user_id, first_name, last_name)
     VALUES ($1,$2,$3)`,
    [inserted.rows[0].id, payload.first_name, payload.last_name]
  );

  res.status(201).json({ teacher: inserted.rows[0] });
}

export async function createParent(req, res) {
  const payload = parentSchema.parse(req.body);
  const hash = await bcrypt.hash(payload.password, 10);
  const role = await query(`SELECT id FROM roles WHERE code='PARENT'`);
  const roleId = role.rows[0]?.id;

  const inserted = await query(
    `INSERT INTO users(role_id, username, email, password_hash)
     VALUES ($1,$2,$3,$4)
     RETURNING id, username, email`,
    [roleId, payload.username, payload.email || null, hash]
  );

  const p = await query(
    `INSERT INTO parents(user_id, first_name, last_name, phone)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [inserted.rows[0].id, payload.first_name, payload.last_name, payload.phone || null]
  );

  res.status(201).json({ parent: p.rows[0] });
}

export async function linkParentStudent(req, res) {
  const payload = linkParentSchema.parse(req.body);
  const link = await query(
    `INSERT INTO parent_student(parent_id, student_id)
     VALUES ($1,$2)
     ON CONFLICT (parent_id, student_id) DO NOTHING
     RETURNING *`,
    [payload.parent_id, payload.student_id]
  );
  res.status(201).json({ linked: link.rows[0] || { ...payload, already_exists: true } });
}

export async function createClass(req, res) {
  const payload = classSchema.parse(req.body);
  const result = await query(
    `INSERT INTO classes(class_name, section, academic_year)
     VALUES ($1,$2,$3)
     RETURNING *`,
    [payload.class_name, payload.section, payload.academic_year]
  );
  res.status(201).json({ class: result.rows[0] });
}

export async function listClasses(req, res) {
  const { limit, offset, page } = pagination(req);
  const q = req.query.q ? `%${req.query.q}%` : null;
  const sql = q
    ? `SELECT * FROM classes WHERE class_name ILIKE $1 OR section ILIKE $1 ORDER BY id DESC LIMIT $2 OFFSET $3`
    : `SELECT * FROM classes ORDER BY id DESC LIMIT $1 OFFSET $2`;
  const rows = q ? await query(sql, [q, limit, offset]) : await query(sql, [limit, offset]);
  res.json({ page, limit, items: rows.rows });
}

export async function updateClass(req, res) {
  const id = Number(req.params.id);
  const payload = classUpdateSchema.parse(req.body);
  const fields = [];
  const values = [];
  let i = 1;
  for (const [k, v] of Object.entries(payload)) {
    fields.push(`${k}=$${i++}`);
    values.push(v);
  }
  if (!fields.length) return res.status(400).json({ message: "No fields to update" });
  values.push(id);
  const r = await query(`UPDATE classes SET ${fields.join(", ")} WHERE id=$${i} RETURNING *`, values);
  if (!r.rows[0]) return res.status(404).json({ message: "Class not found" });
  res.json({ class: r.rows[0] });
}

export async function deleteClass(req, res) {
  const id = Number(req.params.id);
  await query(`DELETE FROM classes WHERE id=$1`, [id]);
  res.json({ message: "Class deleted" });
}

export async function createStudent(req, res) {
  const payload = studentSchema.parse(req.body);
  const hashed = await bcrypt.hash(payload.admission_no, 10);

  const studentRole = await query(`SELECT id FROM roles WHERE code='STUDENT'`);
  const roleId = studentRole.rows[0]?.id;

  const user = await query(
    `INSERT INTO users(role_id, username, password_hash)
     VALUES ($1,$2,$3)
     RETURNING id, username`,
    [roleId, payload.admission_no, hashed]
  );

  const student = await query(
    `INSERT INTO students(user_id, admission_no, first_name, last_name, gender, class_id, parent_contact)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      user.rows[0].id,
      payload.admission_no,
      payload.first_name,
      payload.last_name,
      payload.gender,
      payload.class_id,
      payload.parent_contact
    ]
  );

  res.status(201).json({
    student: student.rows[0],
    login_credentials: {
      username: payload.admission_no,
      default_password: payload.admission_no
    }
  });
}

export async function listStudents(req, res) {
  const { page, limit, offset } = pagination(req);
  const classId = req.query.class_id ? Number(req.query.class_id) : null;
  const q = req.query.q ? `%${req.query.q}%` : null;

  let sql = `SELECT s.*, c.class_name, c.section
             FROM students s
             JOIN classes c ON c.id=s.class_id`;
  const values = [];
  const where = [];
  if (classId) {
    values.push(classId);
    where.push(`s.class_id=$${values.length}`);
  }
  if (q) {
    values.push(q);
    where.push(`(s.first_name ILIKE $${values.length} OR s.last_name ILIKE $${values.length} OR s.admission_no ILIKE $${values.length})`);
  }
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  values.push(limit, offset);
  sql += ` ORDER BY s.id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

  const rows = await query(sql, values);
  res.json({ page, limit, items: rows.rows });
}

export async function updateStudent(req, res) {
  const id = Number(req.params.id);
  const payload = studentUpdateSchema.parse(req.body);
  const fields = [];
  const values = [];
  let i = 1;
  for (const [k, v] of Object.entries(payload)) {
    fields.push(`${k}=$${i++}`);
    values.push(v);
  }
  if (!fields.length) return res.status(400).json({ message: "No fields to update" });
  values.push(id);
  const r = await query(`UPDATE students SET ${fields.join(", ")} WHERE id=$${i} RETURNING *`, values);
  if (!r.rows[0]) return res.status(404).json({ message: "Student not found" });
  res.json({ student: r.rows[0] });
}

export async function deleteStudent(req, res) {
  const id = Number(req.params.id);
  const st = await query(`SELECT user_id FROM students WHERE id=$1`, [id]);
  if (!st.rows[0]) return res.status(404).json({ message: "Student not found" });
  await query(`DELETE FROM users WHERE id=$1`, [st.rows[0].user_id]);
  res.json({ message: "Student deleted" });
}

export async function createSubject(req, res) {
  const payload = subjectSchema.parse(req.body);
  const result = await query(
    `INSERT INTO subjects(class_id, name, teacher_user_id)
     VALUES ($1,$2,$3)
     RETURNING *`,
    [payload.class_id, payload.name, payload.teacher_user_id]
  );
  res.status(201).json({ subject: result.rows[0] });
}

export async function listSubjects(req, res) {
  const { page, limit, offset } = pagination(req);
  const classId = req.query.class_id ? Number(req.query.class_id) : null;
  const rows = classId
    ? await query(
        `SELECT s.*, c.class_name FROM subjects s JOIN classes c ON c.id=s.class_id WHERE s.class_id=$1 ORDER BY s.id DESC LIMIT $2 OFFSET $3`,
        [classId, limit, offset]
      )
    : await query(
        `SELECT s.*, c.class_name FROM subjects s JOIN classes c ON c.id=s.class_id ORDER BY s.id DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
  res.json({ page, limit, items: rows.rows });
}

export async function updateSubject(req, res) {
  const id = Number(req.params.id);
  const payload = subjectUpdateSchema.parse(req.body);
  const fields = [];
  const values = [];
  let i = 1;
  for (const [k, v] of Object.entries(payload)) {
    fields.push(`${k}=$${i++}`);
    values.push(v);
  }
  if (!fields.length) return res.status(400).json({ message: "No fields to update" });
  values.push(id);
  const r = await query(`UPDATE subjects SET ${fields.join(", ")} WHERE id=$${i} RETURNING *`, values);
  if (!r.rows[0]) return res.status(404).json({ message: "Subject not found" });
  res.json({ subject: r.rows[0] });
}

export async function deleteSubject(req, res) {
  const id = Number(req.params.id);
  await query(`DELETE FROM subjects WHERE id=$1`, [id]);
  res.json({ message: "Subject deleted" });
}

export async function createTimetable(req, res) {
  const payload = timetableSchema.parse(req.body);
  const result = await query(
    `INSERT INTO timetable(class_id, day_of_week, period_no, subject_id, teacher_id, start_time, end_time)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      payload.class_id,
      payload.day_of_week,
      payload.period_no,
      payload.subject_id,
      payload.teacher_id,
      payload.start_time,
      payload.end_time
    ]
  );
  res.status(201).json({ timetable: result.rows[0] });
}

export async function listTimetable(req, res) {
  const classId = req.query.class_id ? Number(req.query.class_id) : null;
  const rows = classId
    ? await query(
        `SELECT t.*, s.name AS subject_name, u.username AS teacher_username
         FROM timetable t
         JOIN subjects s ON s.id=t.subject_id
         JOIN users u ON u.id=t.teacher_id
         WHERE t.class_id=$1
         ORDER BY t.day_of_week, t.period_no`,
        [classId]
      )
    : await query(
        `SELECT t.*, s.name AS subject_name, u.username AS teacher_username
         FROM timetable t
         JOIN subjects s ON s.id=t.subject_id
         JOIN users u ON u.id=t.teacher_id
         ORDER BY t.class_id, t.day_of_week, t.period_no`
      );
  res.json({ items: rows.rows });
}

export async function updateTimetable(req, res) {
  const id = Number(req.params.id);
  const payload = timetableUpdateSchema.parse(req.body);
  const fields = [];
  const values = [];
  let i = 1;
  for (const [k, v] of Object.entries(payload)) {
    fields.push(`${k}=$${i++}`);
    values.push(v);
  }
  if (!fields.length) return res.status(400).json({ message: "No fields to update" });
  values.push(id);
  const r = await query(`UPDATE timetable SET ${fields.join(", ")} WHERE id=$${i} RETURNING *`, values);
  if (!r.rows[0]) return res.status(404).json({ message: "Timetable entry not found" });
  res.json({ timetable: r.rows[0] });
}

export async function deleteTimetable(req, res) {
  const id = Number(req.params.id);
  await query(`DELETE FROM timetable WHERE id=$1`, [id]);
  res.json({ message: "Timetable entry deleted" });
}

export async function createAnnouncement(req, res) {
  const payload = announcementSchema.parse(req.body);
  const result = await query(
    `INSERT INTO announcements(title, body, target_role, created_by)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [payload.title, payload.body, payload.target_role, req.user.id]
  );
  res.status(201).json({ announcement: result.rows[0] });
}

export async function listAnnouncements(req, res) {
  const { page, limit, offset } = pagination(req);
  const targetRole = req.query.target_role;
  const rows = targetRole
    ? await query(
        `SELECT a.*, u.username AS created_by_username FROM announcements a
         JOIN users u ON u.id=a.created_by
         WHERE a.target_role=$1
         ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`,
        [targetRole, limit, offset]
      )
    : await query(
        `SELECT a.*, u.username AS created_by_username FROM announcements a
         JOIN users u ON u.id=a.created_by
         ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
  res.json({ page, limit, items: rows.rows });
}

export async function analytics(req, res) {
  const [students, teachers, attendance, marks] = await Promise.all([
    query(`SELECT count(*)::int AS count FROM students`),
    query(`SELECT count(*)::int AS count FROM teachers`),
    query(`SELECT round(avg(CASE WHEN status='Present' THEN 1 ELSE 0 END)*100,2) AS attendance_pct FROM attendance`),
    query(`SELECT round(avg((marks_obtained/NULLIF(total_marks,0))*100),2) AS marks_pct FROM marks`)
  ]);

  res.json({
    totals: {
      students: students.rows[0]?.count || 0,
      teachers: teachers.rows[0]?.count || 0
    },
    trends: {
      attendance_pct: Number(attendance.rows[0]?.attendance_pct || 0),
      avg_marks_pct: Number(marks.rows[0]?.marks_pct || 0)
    }
  });
}
