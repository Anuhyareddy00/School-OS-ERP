import { z } from "zod";
import { query } from "../db.js";

const attendanceSchema = z.object({
  date: z.string(),
  class_id: z.number().int().positive(),
  records: z.array(
    z.object({
      student_id: z.number().int().positive(),
      status: z.enum(["Present", "Absent"])
    })
  )
});

const marksSchema = z.object({
  student_id: z.number().int().positive(),
  subject_id: z.number().int().positive(),
  exam_type: z.string().min(1),
  marks_obtained: z.number().min(0),
  total_marks: z.number().positive()
});

export async function myClasses(req, res) {
  const result = await query(
    `SELECT DISTINCT c.*
     FROM classes c
     JOIN timetable t ON t.class_id = c.id
     WHERE t.teacher_id = $1
     ORDER BY c.class_name, c.section`,
    [req.user.id]
  );
  res.json({ classes: result.rows });
}

export async function markAttendance(req, res) {
  const payload = attendanceSchema.parse(req.body);

  for (const r of payload.records) {
    await query(
      `INSERT INTO attendance(date, student_id, class_id, status, marked_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (date, student_id)
       DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by, updated_at = now()`,
      [payload.date, r.student_id, payload.class_id, r.status, req.user.id]
    );
  }

  res.json({ message: "Attendance saved", count: payload.records.length });
}

export async function attendanceByClass(req, res) {
  const classId = Number(req.query.class_id);
  const from = req.query.from;
  const to = req.query.to;
  const values = [classId];
  let sql = `SELECT a.*, s.first_name, s.last_name
             FROM attendance a
             JOIN students s ON s.id=a.student_id
             WHERE a.class_id=$1`;
  if (from) {
    values.push(from);
    sql += ` AND a.date >= $${values.length}`;
  }
  if (to) {
    values.push(to);
    sql += ` AND a.date <= $${values.length}`;
  }
  sql += ` ORDER BY a.date DESC`;
  const rows = await query(sql, values);
  res.json({ items: rows.rows });
}

export async function enterMarks(req, res) {
  const payload = marksSchema.parse(req.body);
  const result = await query(
    `INSERT INTO marks(student_id, subject_id, exam_type, marks_obtained, total_marks, entered_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      payload.student_id,
      payload.subject_id,
      payload.exam_type,
      payload.marks_obtained,
      payload.total_marks,
      req.user.id
    ]
  );

  res.status(201).json({ marks: result.rows[0] });
}

export async function marksByClass(req, res) {
  const classId = Number(req.query.class_id);
  const examType = req.query.exam_type;
  const values = [classId];
  let sql = `SELECT m.*, s.first_name, s.last_name, sub.name AS subject_name
             FROM marks m
             JOIN students s ON s.id=m.student_id
             JOIN subjects sub ON sub.id=m.subject_id
             WHERE s.class_id=$1`;
  if (examType) {
    values.push(examType);
    sql += ` AND m.exam_type=$${values.length}`;
  }
  sql += ` ORDER BY m.created_at DESC`;
  const rows = await query(sql, values);
  res.json({ items: rows.rows });
}

export async function studentProgress(req, res) {
  const studentId = Number(req.params.student_id);
  const [marks, attendance] = await Promise.all([
    query(`SELECT * FROM marks WHERE student_id=$1 ORDER BY created_at DESC`, [studentId]),
    query(`SELECT * FROM attendance WHERE student_id=$1 ORDER BY date DESC`, [studentId])
  ]);
  res.json({ marks: marks.rows, attendance: attendance.rows });
}

export async function uploadAssignment(req, res) {
  const payload = z
    .object({
      class_id: z.number().int().positive(),
      title: z.string().min(3),
      instructions: z.string().min(5),
      due_date: z.string()
    })
    .parse(req.body);

  const result = await query(
    `INSERT INTO announcements(title, body, target_role, created_by)
     VALUES ($1,$2,'STUDENT',$3)
     RETURNING *`,
    [
      `Assignment: ${payload.title}`,
      `${payload.instructions}\nDue Date: ${payload.due_date}\nClass: ${payload.class_id}`,
      req.user.id
    ]
  );

  res.status(201).json({ assignment_notice: result.rows[0] });
}
