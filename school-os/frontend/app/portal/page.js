"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { AttendanceChart, MarksChart } from "../../components/charts";

const modules = [
  "Dashboard",
  "Students",
  "Attendance",
  "Marks",
  "Timetable",
  "Announcements",
  "AI Assistant"
];

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function PortalPage() {
  const [token, setToken] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("Dashboard");
  const [msg, setMsg] = useState("");
  const [portal, setPortal] = useState({});
  const [studentId, setStudentId] = useState("");
  const [aiContent, setAiContent] = useState("");

  useEffect(() => {
    setToken(localStorage.getItem("token") || "");
    setRole(localStorage.getItem("role") || "");
  }, []);

  useEffect(() => {
    if (!token) return;
    loadPortal();
  }, [token]);

  async function loadPortal() {
    try {
      const data = await apiFetch("/portal/dashboard", { token });
      setPortal(data);
      setMsg("Portal loaded");
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function runAi(type) {
    if (!studentId) return setMsg("Student ID is required for AI actions.");
    try {
      const endpoint = type === "remark" ? `/ai/remark/${studentId}` : `/ai/analysis/${studentId}`;
      const out = await apiFetch(endpoint, { method: "POST", token, body: {} });
      setAiContent(out.content || JSON.stringify(out, null, 2));
    } catch (e) {
      setMsg(e.message);
    }
  }

  const attendanceData = useMemo(() => [
    { date: "Week 1", present: 92 },
    { date: "Week 2", present: 89 },
    { date: "Week 3", present: 94 },
    { date: "Week 4", present: 90 }
  ], []);

  const marksData = useMemo(() => [
    { subject: "Math", percent: 86 },
    { subject: "Science", percent: 78 },
    { subject: "English", percent: 72 },
    { subject: "Social", percent: 80 }
  ], []);

  return (
    <div className="row" style={{ alignItems: "flex-start" }}>
      <aside className="card sidebar">
        <h3 style={{ marginTop: 0 }}>Portal</h3>
        <div className="badge">Role: {role || "N/A"}</div>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {modules.map((m) => (
            <button key={m} className={active === m ? "btn secondary" : "btn"} style={{ textAlign: "left" }} onClick={() => setActive(m)}>
              {m}
            </button>
          ))}
          <button className="btn" onClick={loadPortal}>Refresh</button>
        </div>
      </aside>

      <section className="main">
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="small">Portal / {active}</div>
              <h2 style={{ margin: "6px 0 0" }}>School OS Shared Portal</h2>
            </div>
            <div className="row">
              <span className="badge">Student: View Only</span>
              <span className="badge">Teacher: Academic Entry</span>
              <span className="badge">Admin: Full Control</span>
            </div>
          </div>
          <div className="small">{msg}</div>
        </div>

        {active === "Dashboard" && (
          <>
            <div className="row">
              <div className="card kpi"><h4 style={{ marginTop: 0 }}>Students</h4><div>{portal.dashboard?.students ?? "-"}</div></div>
              <div className="card kpi"><h4 style={{ marginTop: 0 }}>Teachers</h4><div>{portal.dashboard?.teachers ?? "-"}</div></div>
              <div className="card kpi"><h4 style={{ marginTop: 0 }}>Attendance</h4><div>90%</div></div>
              <div className="card kpi"><h4 style={{ marginTop: 0 }}>Avg Marks</h4><div>79%</div></div>
            </div>
            <div className="card"><h3 style={{ marginTop: 0 }}>Attendance Trend</h3><AttendanceChart data={attendanceData} /></div>
            <div className="card"><h3 style={{ marginTop: 0 }}>Marks Trend</h3><MarksChart data={marksData} /></div>
          </>
        )}

        {active === "Timetable" && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Weekly Timetable</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>P1</th>
                    <th>P2</th>
                    <th>P3</th>
                    <th>P4</th>
                    <th>P5</th>
                  </tr>
                </thead>
                <tbody>
                  {weekDays.map((d) => (
                    <tr key={d}>
                      <td><b>{d}</b></td>
                      <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {active === "AI Assistant" && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>School OS Agent</h3>
            <div className="row">
              <input className="input" style={{ maxWidth: 240 }} placeholder="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
              <button className="btn secondary" onClick={() => runAi("remark")}>Generate Remark</button>
              <button className="btn" onClick={() => runAi("analysis")}>Performance Analysis</button>
            </div>
            <pre className="card" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{aiContent || "AI output will appear here."}</pre>
          </div>
        )}

        {!["Dashboard", "Timetable", "AI Assistant"].includes(active) && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{active}</h3>
            <p className="small">Module scaffold is ready. Connect role-specific API workflows here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
