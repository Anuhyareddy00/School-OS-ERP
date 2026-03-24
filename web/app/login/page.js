"use client";
import { useState } from "react";
import { apiFetch } from "../lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@school.com");
  const [password, setPassword] = useState("admin123");
  const [role, setRole] = useState("ADMIN");
  const [name, setName] = useState("Admin");
  const [msg, setMsg] = useState("");

  const login = async () => {
    setMsg("Logging in...");
    try {
      const data = await apiFetch("/auth/login", { method: "POST", body: { email, password } });
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      const defaultRoute = "/portal";
      setMsg(`Logged in as ${data.role}. Redirecting to ${defaultRoute} ...`);
      router.push(defaultRoute);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const registerUser = async () => {
    setMsg(`Registering ${role.toLowerCase()}...`);
    try {
      await apiFetch("/auth/register", { method: "POST", body: { name, email, password, role } });
      setMsg("Registered. Now login.");
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 460 }}>
      <h2 style={{ marginTop: 0 }}>Login to School OS</h2>
      <div style={{ display: "grid", gap: 8 }}>
        <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Name (for registration)" />
        <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email or Admission No" />
        <input className="input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (student default: Admission No)" type="password" />
        <select value={role} onChange={(e)=>setRole(e.target.value)}>
          <option value="ADMIN">ADMIN</option>
          <option value="TEACHER">TEACHER</option>
          <option value="STUDENT">STUDENT</option>
          <option value="PARENT">PARENT</option>
        </select>
        <button className="btn" onClick={login}>Login</button>
        <button className="btn secondary" onClick={registerUser}>Register User</button>
        <div style={{ marginTop: 8, whiteSpace: "pre-wrap", color: "var(--muted)" }}>{msg}</div>
      </div>
    </div>
  );
}
