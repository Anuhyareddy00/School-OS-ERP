import { query } from "../db.js";
import { circularDraft, generateRemark, performanceAnalysis, teacherSuggestions } from "../services/ai.service.js";

async function studentContext(studentId) {
  const [student, marks, attendance] = await Promise.all([
    query(`SELECT * FROM students WHERE id=$1`, [studentId]),
    query(`SELECT * FROM marks WHERE student_id=$1 ORDER BY created_at DESC LIMIT 30`, [studentId]),
    query(`SELECT * FROM attendance WHERE student_id=$1 ORDER BY date DESC LIMIT 60`, [studentId])
  ]);
  return { student: student.rows[0], marks: marks.rows, attendance: attendance.rows };
}

export async function aiRemark(req, res) {
  const studentId = Number(req.params.student_id);
  const ctx = await studentContext(studentId);
  if (!ctx.student) return res.status(404).json({ message: "Student not found" });

  const content = await generateRemark(ctx);
  const saved = await query(
    `INSERT INTO ai_reports(student_id, report_type, input_payload, output_payload, created_by)
     VALUES ($1,'REMARK',$2,$3,$4)
     RETURNING *`,
    [studentId, ctx, { content }, req.user.id]
  );
  res.json({ report: saved.rows[0], content });
}

export async function aiAnalysis(req, res) {
  const studentId = Number(req.params.student_id);
  const ctx = await studentContext(studentId);
  if (!ctx.student) return res.status(404).json({ message: "Student not found" });

  const content = await performanceAnalysis(ctx);
  const saved = await query(
    `INSERT INTO ai_reports(student_id, report_type, input_payload, output_payload, created_by)
     VALUES ($1,'ANALYSIS',$2,$3,$4)
     RETURNING *`,
    [studentId, ctx, { content }, req.user.id]
  );
  res.json({ report: saved.rows[0], content });
}

export async function aiCircular(req, res) {
  const content = await circularDraft(req.body || {});
  res.json({ content });
}

export async function aiTeacherSuggestions(req, res) {
  const content = await teacherSuggestions(req.body || {});
  res.json({ content });
}
