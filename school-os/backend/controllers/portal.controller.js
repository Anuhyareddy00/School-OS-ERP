import { query } from "../db.js";

export async function portalDashboard(req, res) {
  const role = req.user.role;

  if (role === "ADMIN") {
    const analytics = await query(`SELECT (SELECT count(*) FROM students) AS students, (SELECT count(*) FROM teachers) AS teachers`);
    return res.json({ role, dashboard: analytics.rows[0] });
  }

  if (role === "TEACHER") {
    const classes = await query(`SELECT DISTINCT c.* FROM classes c JOIN timetable t ON t.class_id=c.id WHERE t.teacher_id=$1`, [req.user.id]);
    return res.json({ role, classes: classes.rows });
  }

  if (role === "STUDENT") {
    const profile = await query(`SELECT * FROM students WHERE user_id=$1`, [req.user.id]);
    return res.json({ role, student: profile.rows[0] || null });
  }

  if (role === "PARENT") {
    const children = await query(`SELECT s.* FROM parent_student ps JOIN parents p ON p.id=ps.parent_id JOIN students s ON s.id=ps.student_id WHERE p.user_id=$1`, [req.user.id]);
    return res.json({ role, children: children.rows });
  }

  return res.json({ role });
}

export async function portalData(req, res) {
  const role = req.user.role;

  if (role === "ADMIN") {
    const [students, classes, subjects, timetable, announcements] = await Promise.all([
      query(`SELECT * FROM students ORDER BY id DESC LIMIT 200`),
      query(`SELECT * FROM classes ORDER BY id DESC LIMIT 100`),
      query(`SELECT * FROM subjects ORDER BY id DESC LIMIT 200`),
      query(`SELECT * FROM timetable ORDER BY class_id, day_of_week, period_no LIMIT 500`),
      query(`SELECT * FROM announcements ORDER BY created_at DESC LIMIT 100`)
    ]);
    return res.json({ role, students: students.rows, classes: classes.rows, subjects: subjects.rows, timetable: timetable.rows, announcements: announcements.rows });
  }

  if (role === "TEACHER") {
    const [classes, announcements] = await Promise.all([
      query(`SELECT DISTINCT c.* FROM classes c JOIN timetable t ON t.class_id=c.id WHERE t.teacher_id=$1`, [req.user.id]),
      query(`SELECT * FROM announcements WHERE target_role IN ('ALL','TEACHER') ORDER BY created_at DESC LIMIT 50`)
    ]);
    return res.json({ role, classes: classes.rows, announcements: announcements.rows });
  }

  if (role === "STUDENT") {
    const student = await query(`SELECT * FROM students WHERE user_id=$1`, [req.user.id]);
    const st = student.rows[0];
    if (!st) return res.json({ role, student: null });
    const [marks, attendance, timetable, announcements] = await Promise.all([
      query(`SELECT m.*, sub.name AS subject_name FROM marks m JOIN subjects sub ON sub.id=m.subject_id WHERE m.student_id=$1 ORDER BY m.created_at DESC`, [st.id]),
      query(`SELECT * FROM attendance WHERE student_id=$1 ORDER BY date DESC`, [st.id]),
      query(`SELECT t.*, sub.name AS subject_name FROM timetable t JOIN subjects sub ON sub.id=t.subject_id WHERE t.class_id=$1 ORDER BY t.day_of_week, t.period_no`, [st.class_id]),
      query(`SELECT * FROM announcements WHERE target_role IN ('ALL','STUDENT') ORDER BY created_at DESC LIMIT 30`)
    ]);
    return res.json({ role, student: st, marks: marks.rows, attendance: attendance.rows, timetable: timetable.rows, announcements: announcements.rows });
  }

  if (role === "PARENT") {
    const children = await query(`SELECT s.* FROM parent_student ps JOIN parents p ON p.id=ps.parent_id JOIN students s ON s.id=ps.student_id WHERE p.user_id=$1`, [req.user.id]);
    return res.json({ role, children: children.rows });
  }

  return res.json({ role });
}
