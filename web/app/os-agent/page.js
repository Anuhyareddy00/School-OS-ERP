"use client";
import { useEffect, useState } from "react";
import { apiFetch, apiUpload } from "../lib/api";

export default function OSAgentPage() {
  const [studentId, setStudentId] = useState("");
  const [term, setTerm] = useState("Term 1");
  const [weakSubject, setWeakSubject] = useState("English");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("Parent follow-up");
  const [message, setMessage] = useState("");
  const [remark, setRemark] = useState(null);
  const [reportCard, setReportCard] = useState(null);
  const [reminder, setReminder] = useState(null);
  const [role, setRole] = useState("");
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState("marks_analysis");
  const [files, setFiles] = useState([]);
  const [fileOutput, setFileOutput] = useState(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  useEffect(() => {
    setRole(localStorage.getItem("role") || "");
    const token = localStorage.getItem("token") || "";
    apiFetch("/agent/prompts", { token })
      .then(setTemplates)
      .catch(() => {});
  }, []);

  const allowed = role === "ADMIN" || role === "TEACHER";

  const runRemark = async () => {
    try {
      setReportCard(null);
      const res = await apiFetch("/agent/remarks", {
        method: "POST",
        token,
        body: { studentId, term, weakSubject }
      });
      setRemark(res);
      setMessage("OS Agent generated remark analysis.");
    } catch (e) {
      setMessage(e.message);
    }
  };

  const runReportCardSummary = async () => {
    try {
      setRemark(null);
      const res = await apiFetch("/agent/report-card-summary", {
        method: "POST",
        token,
        body: { studentId, term }
      });
      setReportCard(res);
      setMessage("OS Agent analyzed the report card.");
    } catch (e) {
      setMessage(e.message);
    }
  };

  const runReminder = async () => {
    try {
      const res = await apiFetch("/agent/reminders", {
        method: "POST",
        token,
        body: { title, dueDate: date, studentId, channel: "IN_APP", notes: "Auto-created from OS Agent console." }
      });
      setReminder(res);
      setMessage("OS Agent created reminder.");
    } catch (e) {
      setMessage(e.message);
    }
  };

  const runFileAnalysis = async () => {
    try {
      const formData = new FormData();
      formData.append("template", template);
      if (studentId) formData.append("studentId", studentId);
      for (const f of files) formData.append("files", f);
      const res = await apiUpload("/agent/prompts/run-files", { token, formData });
      setFileOutput(res);
      setMessage("OS Agent analyzed uploaded files.");
    } catch (e) {
      setMessage(e.message);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 760 }}>
      <h2 style={{ marginTop: 0 }}>OS Agent Console</h2>
      <p>
        AI workspace for remarks analysis, student follow-up actions, and reminders inside School OS.
      </p>
      {!allowed && (
        <p style={{ color: "var(--muted)" }}>
          OS Agent is available for Admin/Teacher roles. Students should use the shared Portal.
        </p>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        <input className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Student ID" />
        <input className="input" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Term" />
        <input className="input" value={weakSubject} onChange={(e) => setWeakSubject(e.target.value)} placeholder="Weak Subject" />
        <div className="row">
          <button className="btn secondary" onClick={runRemark} disabled={!studentId || !allowed}>
            Analyze Remarks
          </button>
          <button className="btn" onClick={runReportCardSummary} disabled={!studentId || !allowed}>
            Report Card Summary
          </button>
        </div>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reminder Title" />
        <input className="input" value={date} onChange={(e) => setDate(e.target.value)} placeholder="Due Date YYYY-MM-DD" />
        <div className="row">
          <button className="btn" onClick={runReminder} disabled={!studentId || !allowed}>
            Create Reminder
          </button>
        </div>
        <select value={template} onChange={(e) => setTemplate(e.target.value)}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
        <input className="input" type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
        <div className="row">
          <button className="btn secondary" onClick={runFileAnalysis} disabled={!allowed || files.length === 0}>
            Run File Analysis
          </button>
        </div>
      </div>
      <p style={{ color: "var(--muted)" }}>{message}</p>
      {remark && (
        <div className="card" style={{ marginTop: 10 }}>
          <b>Remark Summary:</b> {remark.overall_summary}
        </div>
      )}
      {reportCard && (
        <div className="card" style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <div><b>Summary:</b> {reportCard.summary}</div>
          <div><b>Overall:</b> {reportCard.overallAveragePct}% ({reportCard.overallPerformance})</div>
          <div><b>Attendance:</b> {reportCard.attendancePct}% ({reportCard.attendanceStatus})</div>
          <div><b>Strengths:</b> {reportCard.strengths.join(" ")}</div>
          <div><b>Risks:</b> {reportCard.risks.join(" ")}</div>
          <div><b>Actions:</b> {reportCard.recommendedActions.join(" ")}</div>
        </div>
      )}
      {reminder && (
        <div className="card" style={{ marginTop: 10 }}>
          <b>Reminder:</b> {reminder.title} ({reminder.dueDate})
        </div>
      )}
      {fileOutput && (
        <div className="card" style={{ marginTop: 10 }}>
          <b>Files analyzed:</b> {fileOutput.filesCount}
        </div>
      )}
    </div>
  );
}
