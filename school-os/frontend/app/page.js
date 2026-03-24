import Link from "next/link";

export default function HomePage() {
  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>School OS</h1>
      <p>Production-ready School ERP with AI integration for Admin, Teacher, Student, and Parent portals.</p>
      <div className="row">
        <Link className="btn" href="/login">Login</Link>
        <Link className="btn secondary" href="/portal">Open Portal</Link>
      </div>
    </div>
  );
}
