import Link from "next/link";

export default function Home() {
  const coreModules = [
    "Admissions & Enrollment",
    "Student Information System",
    "Attendance & Timetable",
    "Assessment, Exams & Reports",
    "Homework & Lesson Planning",
    "Behavior, Remarks & Wellbeing",
    "Parent Portal & Communication",
    "Fees, Payments & Receipts",
    "HR, Staff & Payroll",
    "Library, Transport & Hostel",
    "Inventory, Procurement & Assets",
    "Analytics, Compliance & Exports"
  ];

  const agentFeatures = [
    "AI remarks analysis from marks + attendance trends",
    "Proactive reminders for teachers, parents, and students",
    "Early warning signals for low performance and absenteeism",
    "Action-plan suggestions for term improvement",
    "Meeting summaries and follow-up task recommendations"
  ];

  return (
    <div className="row" style={{ alignItems: "stretch" }}>
      <div className="card" style={{ flex: "1 1 380px" }}>
        <h1 style={{ marginTop: 0 }}>School OS</h1>
        <p>
          A Gibbon-style school ERP foundation with integrated intelligence from{" "}
          <b>OS Agent</b>.
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <Link className="btn" href="/login">Enter Platform</Link>
          <Link className="btn" href="/portal">Open Shared Portal</Link>
        </div>
      </div>

      <div className="card" style={{ flex: "1 1 320px" }}>
        <h3 style={{ marginTop: 0 }}>OS Agent Capabilities</h3>
        <ul>
          {agentFeatures.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ width: "100%" }}>
        <h3 style={{ marginTop: 0 }}>Target ERP Coverage (Gibbon-like)</h3>
        <div className="row">
          {coreModules.map((item) => (
            <span key={item} className="chip">{item}</span>
          ))}
        </div>
        <p style={{ marginBottom: 0, color: "var(--muted)" }}>
          This repo now includes working starter flows for auth, classes, students, attendance,
          marks, exports, AI remarks, and AI reminders. Remaining modules can be built incrementally
          on this base.
        </p>
      </div>
    </div>
  );
}
