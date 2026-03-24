"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, apiUpload } from "../lib/api";

const modules = [
  { id: "dashboard", label: "Dashboard" },
  { id: "sis", label: "SIS" },
  { id: "attendance", label: "Attendance" },
  { id: "marks", label: "Marks" },
  { id: "timetable", label: "Timetable" },
  { id: "fees", label: "Fees" },
  { id: "messages", label: "Messages" },
  { id: "os-agent", label: "OS Agent" },
];

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function PortalPage() {
  const [role, setRole] = useState("");
  const [token, setToken] = useState("");
  const [active, setActive] = useState("dashboard");
  const [msg, setMsg] = useState("");

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({ students: [], attendance: [], marks: [] });
  const [timetable, setTimetable] = useState([]);
  const [feesSummary, setFeesSummary] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [exams, setExams] = useState([]);
  const [allMarks, setAllMarks] = useState([]);
  const [agentReminders, setAgentReminders] = useState([]);

  const [classId, setClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [newClassGrade, setNewClassGrade] = useState("10");
  const [newClassSection, setNewClassSection] = useState("A");
  const [newSubjectName, setNewSubjectName] = useState("Mathematics");
  const [newStudentAdmissionNo, setNewStudentAdmissionNo] = useState("ADM001");
  const [newStudentName, setNewStudentName] = useState("Student Name");
  const [newStudentRollNo, setNewStudentRollNo] = useState("1");
  const [linkStudentId, setLinkStudentId] = useState("");
  const [linkStudentEmail, setLinkStudentEmail] = useState("");
  const [linkParentEmail, setLinkParentEmail] = useState("");

  const [attendanceStatusByStudent, setAttendanceStatusByStudent] = useState({});

  const [newExamName, setNewExamName] = useState("Periodic Test 1");
  const [newExamTerm, setNewExamTerm] = useState("Term 1");
  const [newExamYear, setNewExamYear] = useState(String(new Date().getFullYear()));
  const [newExamMaxMarks, setNewExamMaxMarks] = useState("100");
  const [markExamId, setMarkExamId] = useState("");
  const [markSubjectId, setMarkSubjectId] = useState("");
  const [markScore, setMarkScore] = useState("80");

  const [newTimetableDay, setNewTimetableDay] = useState("Monday");
  const [newTimetablePeriod, setNewTimetablePeriod] = useState("1");
  const [newTimetableSubjectId, setNewTimetableSubjectId] = useState("");
  const [newTimetableTeacherName, setNewTimetableTeacherName] = useState("Teacher 1");
  const [newTimetableStart, setNewTimetableStart] = useState("09:00");
  const [newTimetableEnd, setNewTimetableEnd] = useState("09:45");

  const [newFeeYear, setNewFeeYear] = useState(String(new Date().getFullYear()));
  const [newFeeType, setNewFeeType] = useState("Tuition");
  const [newFeeAmount, setNewFeeAmount] = useState("1500");
  const [newFeeDueDate, setNewFeeDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [payFeeStructureId, setPayFeeStructureId] = useState("");
  const [payStudentId, setPayStudentId] = useState("");
  const [payAmount, setPayAmount] = useState("500");
  const [payMode, setPayMode] = useState("UPI");

  const [messageTitle, setMessageTitle] = useState("Progress Update");
  const [messageBody, setMessageBody] = useState("Please review this week's progress report.");
  const [messageRecipientRole, setMessageRecipientRole] = useState("PARENT");

  const [promptTemplates, setPromptTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("marks_analysis");
  const [agentFiles, setAgentFiles] = useState([]);
  const [agentOutput, setAgentOutput] = useState(null);
  const [reportCardTerm, setReportCardTerm] = useState("Term 1");

  useEffect(() => {
    setRole(localStorage.getItem("role") || "");
    setToken(localStorage.getItem("token") || "");
  }, []);

  const canEnterData = role === "ADMIN" || role === "TEACHER";
  const canChangeAll = role === "ADMIN";
  const canViewOnly = role === "STUDENT";

  const classStudents = useMemo(
    () => students.filter((s) => String(s.classId) === String(classId)),
    [students, classId]
  );

  const periods = useMemo(() => {
    const set = new Set(timetable.map((t) => Number(t.periodNo)));
    return [...set].sort((a, b) => a - b);
  }, [timetable]);

  const timetableGrid = useMemo(() => {
    const grid = {};
    for (const day of weekDays) grid[day] = {};
    for (const slot of timetable) {
      if (!grid[slot.dayOfWeek]) grid[slot.dayOfWeek] = {};
      grid[slot.dayOfWeek][Number(slot.periodNo)] = slot;
    }
    return grid;
  }, [timetable]);

  const studentCards = useMemo(() => {
    return students.map((s) => {
      const marks = records.marks.filter((m) => m.studentId === s.id);
      const attendance = records.attendance.filter((a) => a.studentId === s.id);
      const avg =
        marks.length > 0
          ? Math.round((marks.reduce((sum, m) => sum + Number(m.score || 0), 0) / marks.length) * 10) / 10
          : 0;
      const present = attendance.filter((a) => String(a.status).toUpperCase() === "PRESENT").length;
      const attendancePct = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
      return {
        ...s,
        avg,
        attendancePct,
      };
    });
  }, [students, records]);

  const importantNotices = useMemo(() => {
    return messages
      .filter((m) => m?.title || m?.body)
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        title: m.title || "Notice",
        body: m.body || "",
        role: m.recipientRole || "ALL",
      }));
  }, [messages]);

  const upcomingEvents = useMemo(() => {
    return timetable
      .slice()
      .sort((a, b) => {
        const dayDiff = weekDays.indexOf(a.dayOfWeek) - weekDays.indexOf(b.dayOfWeek);
        if (dayDiff !== 0) return dayDiff;
        return Number(a.periodNo) - Number(b.periodNo);
      })
      .slice(0, 6)
      .map((t) => ({
        id: t.id,
        label: `${t.dayOfWeek} P${t.periodNo}`,
        title: t.subjectName || "Class Session",
        time: `${t.startTime || "--"} - ${t.endTime || "--"}`,
      }));
  }, [timetable]);

  const dashboardReminders = useMemo(() => {
    const feeDue = feesSummary
      .filter((f) => f.status !== "PAID")
      .slice(0, 3)
      .map((f) => ({
        id: `fee-${f.studentId}-${f.feeStructureId}`,
        text: `${f.studentName}: ${f.feeType} due ${f.dueAmount}`,
      }));

    const ai = agentReminders.slice(0, 3).map((r) => ({
      id: `ai-${r.id}`,
      text: `${r.title} (${r.dueDate || "No due date"})`,
    }));

    return [...feeDue, ...ai].slice(0, 6);
  }, [feesSummary, agentReminders]);

  useEffect(() => {
    if (!promptTemplates.length) return;
    const exists = promptTemplates.some((p) => p.id === selectedTemplate);
    if (!exists) setSelectedTemplate(promptTemplates[0].id);
  }, [promptTemplates, selectedTemplate]);

  useEffect(() => {
    if (!token) return;
    loadPortal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  async function settle(tasks) {
    const settled = await Promise.allSettled(tasks.map((t) => t.run()));
    const map = {};
    const failures = [];
    settled.forEach((result, i) => {
      const key = tasks[i].key;
      if (result.status === "fulfilled") {
        map[key] = result.value;
      } else {
        map[key] = null;
        failures.push(`${key}: ${result.reason?.message || "failed"}`);
      }
    });
    return { map, failures };
  }

  async function loadPortal() {
    if (!token) {
      setMsg("Please login first.");
      return;
    }

    const tasks = [
      { key: "records", run: () => apiFetch("/portal/my/records", { token }) },
      { key: "portalTimetable", run: () => apiFetch("/portal/my/timetable", { token }) },
      { key: "portalFees", run: () => apiFetch("/portal/my/fees", { token }) },
      { key: "portalMessages", run: () => apiFetch("/portal/my/messages", { token }) },
      { key: "prompts", run: () => apiFetch("/agent/prompts", { token }) },
    ];

    if (canEnterData) {
      tasks.push({ key: "classes", run: () => apiFetch("/admin/classes", { token }) });
      tasks.push({ key: "subjects", run: () => apiFetch("/admin/subjects", { token }) });
      tasks.push({ key: "exams", run: () => apiFetch("/teacher/exams", { token }) });
      tasks.push({ key: "agentReminders", run: () => apiFetch("/agent/reminders", { token }) });
    }

    if (canChangeAll) {
      tasks.push({ key: "adminStudents", run: () => apiFetch("/admin/students", { token }) });
      tasks.push({ key: "adminTimetable", run: () => apiFetch("/admin/timetable", { token }) });
      tasks.push({ key: "adminFeeStructures", run: () => apiFetch("/admin/fees/structures", { token }) });
      tasks.push({ key: "adminFeePayments", run: () => apiFetch("/admin/fees/payments", { token }) });
      tasks.push({ key: "teacherMarks", run: () => apiFetch("/teacher/marks", { token }) });
    } else if (canEnterData) {
      tasks.push({ key: "teacherMarks", run: () => apiFetch("/teacher/marks", { token }) });
    }

    try {
      const { map, failures } = await settle(tasks);

      const rec = map.records || {};
      const portalStudents = rec.students || [];
      const adminStudents = map.adminStudents || [];
      const mergedStudents = portalStudents.length ? portalStudents : adminStudents;

      setStudents(mergedStudents);
      setRecords({
        students: portalStudents,
        attendance: rec.attendance || [],
        marks: rec.marks || [],
      });
      setClasses(map.classes || []);
      setSubjects(map.subjects || []);
      setTimetable(map.adminTimetable || map.portalTimetable || []);
      setFeesSummary(map.portalFees?.summary || []);
      setFeeStructures(map.adminFeeStructures || []);
      setFeePayments(map.adminFeePayments || map.portalFees?.payments || []);
      setMessages(map.portalMessages || []);
      setPromptTemplates(Array.isArray(map.prompts) ? map.prompts : []);
      setExams(map.exams || []);
      setAllMarks(map.teacherMarks || rec.marks || []);
      setAgentReminders(Array.isArray(map.agentReminders) ? map.agentReminders : []);

      if (!classId && mergedStudents.length) setClassId(mergedStudents[0].classId);
      if (!selectedStudentId && mergedStudents.length) setSelectedStudentId(mergedStudents[0].id);
      if (!markExamId && Array.isArray(map.exams) && map.exams.length) setMarkExamId(map.exams[0].id);
      if (!markSubjectId && Array.isArray(map.subjects) && map.subjects.length) setMarkSubjectId(map.subjects[0].id);
      if (!newTimetableSubjectId && Array.isArray(map.subjects) && map.subjects.length) {
        setNewTimetableSubjectId(map.subjects[0].id);
      }
      if (!payStudentId && mergedStudents.length) setPayStudentId(mergedStudents[0].id);
      if (!payFeeStructureId && Array.isArray(map.adminFeeStructures) && map.adminFeeStructures.length) {
        setPayFeeStructureId(map.adminFeeStructures[0].id);
      }

      setMsg(
        failures.length
          ? "Portal loaded. Some sections are temporarily unavailable."
          : "Portal loaded."
      );
    } catch (e) {
      setMsg("Unable to load portal right now. Please try refresh.");
    }
  }

  async function createClass() {
    try {
      await apiFetch("/admin/classes", {
        method: "POST",
        token,
        body: { grade: newClassGrade, section: newClassSection },
      });
      setMsg("Class created.");
      await loadPortal();
    } catch (e) {
      setMsg(e.message || "Failed to create class");
    }
  }

  async function createSubject() {
    try {
      await apiFetch("/admin/subjects", {
        method: "POST",
        token,
        body: { name: newSubjectName },
      });
      setMsg("Subject created.");
      await loadPortal();
    } catch (e) {
      setMsg(e.message || "Failed to create subject");
    }
  }

  async function createStudent() {
    try {
      const out = await apiFetch("/admin/students", {
        method: "POST",
        token,
        body: {
          admissionNo: newStudentAdmissionNo,
          name: newStudentName,
          rollNo: Number(newStudentRollNo),
          classId,
        },
      });
      let details = "Student created.";
      if (out.defaultStudentLoginId) {
        details = `Student created. Login: ${out.defaultStudentLoginId} / ${out.defaultStudentPassword}`;
      }
      setMsg(details);
      await loadPortal();
    } catch (e) {
      setMsg(e.message || "Failed to create student");
    }
  }

  async function linkAccounts() {
    try {
      await apiFetch("/admin/students/link-by-email", {
        method: "POST",
        token,
        body: {
          studentId: linkStudentId,
          studentUserEmail: linkStudentEmail || null,
          parentUserEmail: linkParentEmail || null,
        },
      });
      setMsg("Student/parent account linking updated.");
      await loadPortal();
    } catch (e) {
      setMsg(e.message || "Failed to link accounts");
    }
  }

  async function submitAttendance() {
    try {
      const targets = classStudents.length ? classStudents : students;
      const payload = targets.map((s) => ({
        studentId: s.id,
        status: attendanceStatusByStudent[s.id] || "PRESENT",
      }));

      const out = await apiFetch("/teacher/attendance", {
        method: "POST",
        token,
        body: { classId, date, records: payload },
      });
      setMsg(`Attendance saved: ${out.saved}`);
      await loadPortal();
    } catch (e) {
      setMsg(e.message || "Failed to submit attendance");
    }
  }

  async function createExam() {
    try {
      await apiFetch("/teacher/exams", {
        method: "POST",
        token,
        body: {
          classId,
          name: newExamName,
          term: newExamTerm,
          year: Number(newExamYear),
          maxMarks: Number(newExamMaxMarks),
        },
      });
      setMsg("Exam created.");
      await loadPortal();
    } catch (e) {
      setMsg(e.message || "Failed to create exam");
    }
  }

  async function uploadMarks() {
    try {
      const out = await apiFetch("/teacher/marks", {
        method: "POST",
        token,
        body: {
          examId: markExamId,
          studentId: selectedStudentId,
          subjectId: markSubjectId,
          score: Number(markScore),
        },
      });
      setMsg(`Marks saved. Grade: ${out.grade}`);
      await loadPortal();
    } catch (e) {
      setMsg(e.message || "Failed to upload marks");
    }
  }

  async function createTimetable() {
    try {
      await apiFetch("/admin/timetable", {
        method: "POST",
        token,
        body: {
          classId,
          dayOfWeek: newTimetableDay,
          periodNo: Number(newTimetablePeriod),
          subjectId: newTimetableSubjectId,
          teacherName: newTimetableTeacherName,
          startTime: newTimetableStart,
          endTime: newTimetableEnd,
        },
      });
      setMsg("Timetable entry added.");
      await loadPortal();
    } catch (e) {
      setMsg(e.message || "Failed to create timetable");
    }
  }

  async function createFeeStructure() {
    try {
      await apiFetch("/admin/fees/structures", {
        method: "POST",
        token,
        body: {
          classId,
          academicYear: Number(newFeeYear),
          feeType: newFeeType,
          amount: Number(newFeeAmount),
          dueDate: newFeeDueDate,
        },
      });
      setMsg("Fee structure created.");
      await loadPortal();
    } catch (e) {
      setMsg(e.message || "Failed to create fee structure");
    }
  }

  async function collectPayment() {
    try {
      await apiFetch("/admin/fees/payments", {
        method: "POST",
        token,
        body: {
          studentId: payStudentId,
          feeStructureId: payFeeStructureId,
          paidAmount: Number(payAmount),
          paymentMode: payMode,
        },
      });
      setMsg("Payment recorded.");
      await loadPortal();
    } catch (e) {
      setMsg(e.message || "Failed to collect payment");
    }
  }

  async function sendMessage() {
    try {
      if (canEnterData) {
        await apiFetch("/admin/messages", {
          method: "POST",
          token,
          body: {
            recipientRole: messageRecipientRole,
            studentId: selectedStudentId || null,
            title: messageTitle,
            body: messageBody,
          },
        });
      } else {
        await apiFetch("/portal/my/messages", {
          method: "POST",
          token,
          body: {
            recipientRole: "ADMIN",
            studentId: selectedStudentId || null,
            title: messageTitle,
            body: messageBody,
          },
        });
      }
      setMsg("Message sent.");
      await loadPortal();
    } catch (e) {
      setMsg(e.message || "Failed to send message");
    }
  }

  async function runTemplate() {
    try {
      const out = await apiFetch("/agent/prompts/run", {
        method: "POST",
        token,
        body: {
          template: selectedTemplate,
          studentId: selectedStudentId || null,
          context: { role, source: "portal" },
        },
      });
      setAgentOutput(out);
      setMsg("OS Agent prompt executed.");
    } catch (e) {
      setMsg(e.message || "OS Agent failed");
    }
  }

  async function runTemplateWithFiles() {
    try {
      const formData = new FormData();
      formData.append("template", selectedTemplate);
      if (selectedStudentId) formData.append("studentId", selectedStudentId);
      for (const file of agentFiles) formData.append("files", file);
      const out = await apiUpload("/agent/prompts/run-files", { token, formData });
      setAgentOutput(out);
      setMsg("OS Agent file analysis completed.");
    } catch (e) {
      setMsg(e.message || "OS Agent file run failed");
    }
  }

  async function runReportCardSummary() {
    try {
      const out = await apiFetch("/agent/report-card-summary", {
        method: "POST",
        token,
        body: {
          studentId: selectedStudentId,
          term: reportCardTerm || null,
        },
      });
      setAgentOutput(out);
      setMsg("OS Agent report card analysis completed.");
    } catch (e) {
      setMsg(e.message || "OS Agent report-card analysis failed");
    }
  }

  return (
    <div className="row" style={{ alignItems: "flex-start" }}>
      <aside className="card" style={{ flex: "0 0 240px", position: "sticky", top: 16 }}>
        <h3 style={{ marginTop: 0 }}>School OS</h3>
        <p style={{ color: "var(--muted)" }}>
          Role: <b>{role || "N/A"}</b>
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {modules.map((m) => (
            <button
              key={m.id}
              className={active === m.id ? "btn secondary" : "btn"}
              style={{ textAlign: "left" }}
              onClick={() => setActive(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </aside>

      <main style={{ flex: "1 1 760px", display: "grid", gap: 12 }}>
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="chip">Portal / {modules.find((m) => m.id === active)?.label}</div>
              <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>
                Student: view-only | Teacher: enter academic data | Admin: full control
              </p>
            </div>
            <button className="btn" onClick={loadPortal}>Refresh</button>
          </div>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>{msg}</p>
        </div>

        {active === "dashboard" && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Dashboard</h2>
            <div className="row">
              <span className="chip">Classes: {classes.length}</span>
              <span className="chip">Students: {students.length}</span>
              <span className="chip">Subjects: {subjects.length}</span>
              <span className="chip">Attendance: {records.attendance.length}</span>
              <span className="chip">Marks: {allMarks.length || records.marks.length}</span>
              <span className="chip">Timetable: {timetable.length}</span>
              <span className="chip">Fees: {feesSummary.length}</span>
              <span className="chip">Messages: {messages.length}</span>
            </div>

            <div className="row" style={{ marginTop: 12 }}>
              <div className="card" style={{ flex: "1 1 320px" }}>
                <h4 style={{ marginTop: 0 }}>Important Notices</h4>
                <ul>
                  {importantNotices.length ? (
                    importantNotices.map((n) => (
                      <li key={n.id}>
                        <b>{n.title}</b> ({n.role}): {n.body}
                      </li>
                    ))
                  ) : (
                    <li>No notices yet.</li>
                  )}
                </ul>
              </div>

              <div className="card" style={{ flex: "1 1 320px" }}>
                <h4 style={{ marginTop: 0 }}>Upcoming Events</h4>
                <ul>
                  {upcomingEvents.length ? (
                    upcomingEvents.map((e) => (
                      <li key={e.id}>
                        <b>{e.label}</b>: {e.title} ({e.time})
                      </li>
                    ))
                  ) : (
                    <li>No upcoming timetable events.</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="row" style={{ marginTop: 12 }}>
              <div className="card" style={{ flex: "1 1 320px" }}>
                <h4 style={{ marginTop: 0 }}>Reminders</h4>
                <ul>
                  {dashboardReminders.length ? (
                    dashboardReminders.map((r) => <li key={r.id}>{r.text}</li>)
                  ) : (
                    <li>No active reminders.</li>
                  )}
                </ul>
              </div>

              <div className="card" style={{ flex: "1 1 320px" }}>
                <h4 style={{ marginTop: 0 }}>Today Snapshot</h4>
                <ul>
                  <li>Attendance records: {records.attendance.length}</li>
                  <li>Marks records: {allMarks.length || records.marks.length}</li>
                  <li>Pending fee items: {feesSummary.filter((f) => f.status !== "PAID").length}</li>
                  <li>Unread/Recent messages: {messages.length}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {active === "sis" && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Student Information System</h2>

            {canChangeAll && (
              <>
                <div className="row">
                  <div className="card" style={{ flex: "1 1 260px" }}>
                    <h4 style={{ marginTop: 0 }}>Create Class</h4>
                    <div style={{ display: "grid", gap: 8 }}>
                      <input className="input" value={newClassGrade} onChange={(e) => setNewClassGrade(e.target.value)} placeholder="Grade" />
                      <input className="input" value={newClassSection} onChange={(e) => setNewClassSection(e.target.value)} placeholder="Section" />
                      <button className="btn secondary" onClick={createClass}>Add Class</button>
                    </div>
                  </div>

                  <div className="card" style={{ flex: "1 1 260px" }}>
                    <h4 style={{ marginTop: 0 }}>Create Subject</h4>
                    <div style={{ display: "grid", gap: 8 }}>
                      <input className="input" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Subject name" />
                      <button className="btn secondary" onClick={createSubject}>Add Subject</button>
                    </div>
                  </div>

                  <div className="card" style={{ flex: "1 1 320px" }}>
                    <h4 style={{ marginTop: 0 }}>Create Student</h4>
                    <div style={{ display: "grid", gap: 8 }}>
                      <select value={classId} onChange={(e) => setClassId(e.target.value)}>
                        <option value="">-- Select Class --</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.grade}-{c.section}</option>
                        ))}
                      </select>
                      <input className="input" value={newStudentAdmissionNo} onChange={(e) => setNewStudentAdmissionNo(e.target.value)} placeholder="Admission No" />
                      <input className="input" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="Student name" />
                      <input className="input" value={newStudentRollNo} onChange={(e) => setNewStudentRollNo(e.target.value)} placeholder="Roll no" />
                      <button className="btn secondary" onClick={createStudent} disabled={!classId}>Add Student</button>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ marginTop: 10 }}>
                  <h4 style={{ marginTop: 0 }}>Role-Based Linking</h4>
                  <p style={{ color: "var(--muted)" }}>Auto-resolve parent/student portal records without entering student ID manually.</p>
                  <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
                    <select value={linkStudentId} onChange={(e) => setLinkStudentId(e.target.value)}>
                      <option value="">-- Select Student --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.admissionNo || ""})</option>
                      ))}
                    </select>
                    <input className="input" value={linkStudentEmail} onChange={(e) => setLinkStudentEmail(e.target.value)} placeholder="Student user email (optional)" />
                    <input className="input" value={linkParentEmail} onChange={(e) => setLinkParentEmail(e.target.value)} placeholder="Parent user email (optional)" />
                    <button className="btn" onClick={linkAccounts} disabled={!linkStudentId || (!linkStudentEmail && !linkParentEmail)}>
                      Link Accounts
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="row" style={{ marginTop: 10 }}>
              {studentCards.map((s) => (
                <div key={s.id} className="card" style={{ flex: "1 1 280px" }}>
                  <h4 style={{ marginTop: 0 }}>{s.name}</h4>
                  <p style={{ margin: "4px 0" }}>Admission: <b>{s.admissionNo || "-"}</b></p>
                  <p style={{ margin: "4px 0" }}>Class: <b>{s.classId}</b></p>
                  <p style={{ margin: "4px 0" }}>Avg Marks: <b>{s.avg}</b></p>
                  <p style={{ margin: "4px 0" }}>Attendance: <b>{s.attendancePct}%</b></p>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === "attendance" && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Attendance</h2>
            <div className="row" style={{ marginBottom: 10 }}>
              <select value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">-- Select Class --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.grade}-{c.section}</option>
                ))}
              </select>
              <input className="input" style={{ maxWidth: 180 }} value={date} onChange={(e) => setDate(e.target.value)} />
              <button className="btn secondary" onClick={submitAttendance} disabled={!canEnterData || !classId || canViewOnly}>
                {canEnterData ? "Save Attendance" : "View Only"}
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid var(--line)", padding: 8, textAlign: "left" }}>Student</th>
                    <th style={{ border: "1px solid var(--line)", padding: 8, textAlign: "left" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(classStudents.length ? classStudents : students).map((s) => (
                    <tr key={s.id}>
                      <td style={{ border: "1px solid var(--line)", padding: 8 }}>{s.name}</td>
                      <td style={{ border: "1px solid var(--line)", padding: 8 }}>
                        <select
                          value={attendanceStatusByStudent[s.id] || "PRESENT"}
                          onChange={(e) =>
                            setAttendanceStatusByStudent((prev) => ({ ...prev, [s.id]: e.target.value }))
                          }
                          disabled={!canEnterData || canViewOnly}
                        >
                          <option value="PRESENT">PRESENT</option>
                          <option value="ABSENT">ABSENT</option>
                          <option value="LATE">LATE</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {active === "marks" && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Marks & Exams</h2>

            {canEnterData && (
              <div className="row">
                <div className="card" style={{ flex: "1 1 300px" }}>
                  <h4 style={{ marginTop: 0 }}>Create Exam</h4>
                  <div style={{ display: "grid", gap: 8 }}>
                    <select value={classId} onChange={(e) => setClassId(e.target.value)}>
                      <option value="">-- Select Class --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.grade}-{c.section}</option>
                      ))}
                    </select>
                    <input className="input" value={newExamName} onChange={(e) => setNewExamName(e.target.value)} placeholder="Exam name" />
                    <input className="input" value={newExamTerm} onChange={(e) => setNewExamTerm(e.target.value)} placeholder="Term" />
                    <input className="input" value={newExamYear} onChange={(e) => setNewExamYear(e.target.value)} placeholder="Year" />
                    <input className="input" value={newExamMaxMarks} onChange={(e) => setNewExamMaxMarks(e.target.value)} placeholder="Max marks" />
                    <button className="btn secondary" onClick={createExam} disabled={!classId}>Create Exam</button>
                  </div>
                </div>

                <div className="card" style={{ flex: "1 1 340px" }}>
                  <h4 style={{ marginTop: 0 }}>Upload Marks</h4>
                  <div style={{ display: "grid", gap: 8 }}>
                    <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                      <option value="">-- Select Student --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <select value={markExamId} onChange={(e) => setMarkExamId(e.target.value)}>
                      <option value="">-- Select Exam --</option>
                      {exams.map((e) => (
                        <option key={e.id} value={e.id}>{e.name} ({e.term})</option>
                      ))}
                    </select>
                    <select value={markSubjectId} onChange={(e) => setMarkSubjectId(e.target.value)}>
                      <option value="">-- Select Subject --</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <input className="input" value={markScore} onChange={(e) => setMarkScore(e.target.value)} placeholder="Score" />
                    <button className="btn" onClick={uploadMarks} disabled={!selectedStudentId || !markExamId || !markSubjectId}>
                      Save Marks
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="card" style={{ marginTop: 10 }}>
              <h4 style={{ marginTop: 0 }}>Recent Marks</h4>
              <ul>
                {(allMarks.length ? allMarks : records.marks).slice(0, 40).map((m) => (
                  <li key={m.id}>
                    Student: {m.studentId} | Subject: {m.subjectId} | Score: {m.score} | Grade: {m.grade}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {active === "timetable" && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Timetable</h2>

            {canChangeAll && (
              <div className="row" style={{ marginBottom: 10 }}>
                <select value={classId} onChange={(e) => setClassId(e.target.value)}>
                  <option value="">-- Select Class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.grade}-{c.section}</option>
                  ))}
                </select>
                <select value={newTimetableDay} onChange={(e) => setNewTimetableDay(e.target.value)}>
                  {weekDays.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input className="input" style={{ maxWidth: 120 }} value={newTimetablePeriod} onChange={(e) => setNewTimetablePeriod(e.target.value)} placeholder="Period" />
                <select value={newTimetableSubjectId} onChange={(e) => setNewTimetableSubjectId(e.target.value)}>
                  <option value="">-- Subject --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <input className="input" style={{ maxWidth: 180 }} value={newTimetableTeacherName} onChange={(e) => setNewTimetableTeacherName(e.target.value)} placeholder="Teacher name" />
                <input className="input" style={{ maxWidth: 110 }} value={newTimetableStart} onChange={(e) => setNewTimetableStart(e.target.value)} placeholder="09:00" />
                <input className="input" style={{ maxWidth: 110 }} value={newTimetableEnd} onChange={(e) => setNewTimetableEnd(e.target.value)} placeholder="09:45" />
                <button className="btn secondary" onClick={createTimetable} disabled={!classId || !newTimetableSubjectId}>
                  Add Slot
                </button>
              </div>
            )}

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid var(--line)", padding: 8, textAlign: "left" }}>Day</th>
                    {periods.map((p) => (
                      <th key={p} style={{ border: "1px solid var(--line)", padding: 8, textAlign: "left" }}>P{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekDays.map((day) => (
                    <tr key={day}>
                      <td style={{ border: "1px solid var(--line)", padding: 8, fontWeight: 700 }}>{day}</td>
                      {periods.map((p) => {
                        const slot = timetableGrid[day]?.[p];
                        return (
                          <td key={`${day}-${p}`} style={{ border: "1px solid var(--line)", padding: 8, verticalAlign: "top" }}>
                            {slot ? (
                              <>
                                <div><b>{slot.subjectName || "Subject"}</b></div>
                                <div>{slot.startTime} - {slot.endTime}</div>
                                {slot.teacherName && <div>{slot.teacherName}</div>}
                              </>
                            ) : (
                              <span style={{ color: "var(--muted)" }}>-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {active === "fees" && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Fees</h2>

            {canChangeAll && (
              <div className="row">
                <div className="card" style={{ flex: "1 1 320px" }}>
                  <h4 style={{ marginTop: 0 }}>Create Fee Structure</h4>
                  <div style={{ display: "grid", gap: 8 }}>
                    <select value={classId} onChange={(e) => setClassId(e.target.value)}>
                      <option value="">-- Select Class --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.grade}-{c.section}</option>
                      ))}
                    </select>
                    <input className="input" value={newFeeYear} onChange={(e) => setNewFeeYear(e.target.value)} placeholder="Academic year" />
                    <input className="input" value={newFeeType} onChange={(e) => setNewFeeType(e.target.value)} placeholder="Fee type" />
                    <input className="input" value={newFeeAmount} onChange={(e) => setNewFeeAmount(e.target.value)} placeholder="Amount" />
                    <input className="input" value={newFeeDueDate} onChange={(e) => setNewFeeDueDate(e.target.value)} placeholder="YYYY-MM-DD" />
                    <button className="btn secondary" onClick={createFeeStructure} disabled={!classId}>Create Fee</button>
                  </div>
                </div>

                <div className="card" style={{ flex: "1 1 320px" }}>
                  <h4 style={{ marginTop: 0 }}>Collect Payment</h4>
                  <div style={{ display: "grid", gap: 8 }}>
                    <select value={payStudentId} onChange={(e) => setPayStudentId(e.target.value)}>
                      <option value="">-- Select Student --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <select value={payFeeStructureId} onChange={(e) => setPayFeeStructureId(e.target.value)}>
                      <option value="">-- Select Fee Structure --</option>
                      {feeStructures.map((f) => (
                        <option key={f.id} value={f.id}>{f.feeType} ({f.amount})</option>
                      ))}
                    </select>
                    <input className="input" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Paid amount" />
                    <input className="input" value={payMode} onChange={(e) => setPayMode(e.target.value)} placeholder="Mode" />
                    <button className="btn" onClick={collectPayment} disabled={!payStudentId || !payFeeStructureId}>Record Payment</button>
                  </div>
                </div>
              </div>
            )}

            <div className="card" style={{ marginTop: 10 }}>
              <h4 style={{ marginTop: 0 }}>Fee Summary</h4>
              <ul>
                {feesSummary.map((f) => (
                  <li key={`${f.studentId}-${f.feeStructureId}`}>
                    {f.studentName}: {f.feeType} | Due {f.dueAmount} ({f.status})
                  </li>
                ))}
              </ul>
            </div>

            {canChangeAll && (
              <div className="card" style={{ marginTop: 10 }}>
                <h4 style={{ marginTop: 0 }}>Recent Payments</h4>
                <ul>
                  {feePayments.slice(0, 40).map((p) => (
                    <li key={p.id}>
                      Student: {p.studentId} | Fee: {p.feeStructureId} | Paid: {p.paidAmount} | {p.status}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {active === "messages" && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Messages</h2>
            <div style={{ display: "grid", gap: 8, maxWidth: 620 }}>
              {canEnterData && (
                <select value={messageRecipientRole} onChange={(e) => setMessageRecipientRole(e.target.value)}>
                  <option value="PARENT">PARENT</option>
                  <option value="STUDENT">STUDENT</option>
                </select>
              )}
              <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                <option value="">-- Optional Student Context --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input className="input" value={messageTitle} onChange={(e) => setMessageTitle(e.target.value)} placeholder="Title" />
              <input className="input" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Message body" />
              <button className="btn secondary" onClick={sendMessage} disabled={canViewOnly}>
                {canViewOnly ? "View Only" : "Send Message"}
              </button>
            </div>

            <ul style={{ marginTop: 12 }}>
              {messages.map((m) => (
                <li key={m.id}>
                  <b>{m.title}</b>: {m.body} ({m.senderRole} to {m.recipientRole})
                </li>
              ))}
            </ul>
          </div>
        )}

        {active === "os-agent" && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>OS Agent (Built-in Prompts)</h2>
            <p>Run built-in prompts or generate a direct report-card summary from marks and attendance.</p>

            <div className="row">
              <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
                {promptTemplates.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                <option value="">-- Optional Student --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button className="btn secondary" onClick={runTemplate} disabled={!canEnterData}>
                {canEnterData ? "Run Prompt" : "Admin/Teacher only"}
              </button>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <input
                className="input"
                value={reportCardTerm}
                onChange={(e) => setReportCardTerm(e.target.value)}
                placeholder="Term filter, e.g. Term 1"
              />
              <button className="btn" onClick={runReportCardSummary} disabled={!canEnterData || !selectedStudentId}>
                {canEnterData ? "Report Card Summary" : "Admin/Teacher only"}
              </button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <input className="input" type="file" accept=".csv,text/csv" multiple onChange={(e) => setAgentFiles(Array.from(e.target.files || []))} />
              <button className="btn" onClick={runTemplateWithFiles} disabled={!canEnterData || agentFiles.length === 0}>
                {canEnterData ? "Run With CSV Files" : "Admin/Teacher only"}
              </button>
              <div style={{ color: "var(--muted)" }}>
                {agentFiles.length ? `${agentFiles.length} file(s) selected` : "No files selected"}
              </div>
            </div>

            {agentOutput && (
              <div className="card" style={{ marginTop: 12 }}>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(agentOutput, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
