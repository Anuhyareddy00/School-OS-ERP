import { query } from "../db.js";

export async function myDashboard(req, res) {
  const student = await query(`SELECT * FROM students WHERE user_id=$1`, [req.user.id]);
  const st = student.rows[0];
  if (!st) return res.status(404).json({ message: "Student profile not found" });

  const [marks, attendance, timetable, announcements] = await Promise.all([
    query(`SELECT m.*, s.name AS subject_name FROM marks m JOIN subjects s ON s.id=m.subject_id WHERE m.student_id=$1 ORDER BY m.created_at DESC`, [st.id]),
    query(`SELECT * FROM attendance WHERE student_id=$1 ORDER BY date DESC`, [st.id]),
    query(`SELECT t.*, sub.name AS subject_name FROM timetable t JOIN subjects sub ON sub.id=t.subject_id WHERE t.class_id=$1 ORDER BY t.day_of_week, t.period_no`, [st.class_id]),
    query(`SELECT * FROM announcements WHERE target_role IN ('ALL','STUDENT') ORDER BY created_at DESC LIMIT 20`)
  ]);

  res.json({ student: st, marks: marks.rows, attendance: attendance.rows, timetable: timetable.rows, announcements: announcements.rows });
}

export async function downloadReportCard(req, res) {
  const student = await query(`SELECT * FROM students WHERE user_id=$1`, [req.user.id]);
  const st = student.rows[0];
  if (!st) return res.status(404).json({ message: "Student profile not found" });

  const marks = await query(
    `SELECT m.exam_type, sub.name AS subject_name, m.marks_obtained, m.total_marks
     FROM marks m
     JOIN subjects sub ON sub.id=m.subject_id
     WHERE m.student_id=$1
     ORDER BY m.created_at DESC`,
    [st.id]
  );

  const attendance = await query(
    `SELECT count(*) FILTER (WHERE status='Present')::int AS present,
            count(*)::int AS total
     FROM attendance WHERE student_id=$1`,
    [st.id]
  );

  res.json({
    report_card: {
      student: st,
      marks: marks.rows,
      attendance_summary: attendance.rows[0]
    }
  });
}
