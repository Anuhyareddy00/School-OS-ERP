import { query } from "../db.js";

export async function childOverview(req, res) {
  const rows = await query(
    `SELECT s.*
     FROM parent_student ps
     JOIN parents p ON p.id = ps.parent_id
     JOIN students s ON s.id = ps.student_id
     WHERE p.user_id = $1`,
    [req.user.id]
  );

  const children = rows.rows;
  const childIds = children.map((c) => c.id);
  if (!childIds.length) return res.json({ children: [], marks: [], attendance: [], announcements: [] });

  const [marks, attendance, announcements] = await Promise.all([
    query(`SELECT * FROM marks WHERE student_id = ANY($1::int[]) ORDER BY created_at DESC`, [childIds]),
    query(`SELECT * FROM attendance WHERE student_id = ANY($1::int[]) ORDER BY date DESC`, [childIds]),
    query(`SELECT * FROM announcements WHERE target_role IN ('ALL','PARENT') ORDER BY created_at DESC LIMIT 20`)
  ]);

  res.json({ children, marks: marks.rows, attendance: attendance.rows, announcements: announcements.rows });
}

export async function notifications(req, res) {
  const rows = await query(
    `SELECT * FROM announcements WHERE target_role IN ('ALL','PARENT') ORDER BY created_at DESC LIMIT 50`
  );
  res.json({ items: rows.rows });
}

export async function childReportCard(req, res) {
  const studentId = Number(req.params.student_id);

  const allowed = await query(
    `SELECT 1
     FROM parent_student ps
     JOIN parents p ON p.id=ps.parent_id
     JOIN users u ON u.id=p.user_id
     WHERE u.id=$1 AND ps.student_id=$2
     LIMIT 1`,
    [req.user.id, studentId]
  );

  if (!allowed.rows.length) return res.status(403).json({ message: "Child not linked to parent" });

  const [student, marks, attendance] = await Promise.all([
    query(`SELECT * FROM students WHERE id=$1`, [studentId]),
    query(`SELECT m.*, sub.name AS subject_name FROM marks m JOIN subjects sub ON sub.id=m.subject_id WHERE m.student_id=$1 ORDER BY m.created_at DESC`, [studentId]),
    query(`SELECT * FROM attendance WHERE student_id=$1 ORDER BY date DESC`, [studentId])
  ]);

  res.json({ report_card: { student: student.rows[0], marks: marks.rows, attendance: attendance.rows } });
}
