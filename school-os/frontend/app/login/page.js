"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function login() {
    try {
      const data = await apiFetch("/auth/login", { method: "POST", body: { username, password } });
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);
      router.push("/portal");
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 460 }}>
      <h2 style={{ marginTop: 0 }}>Login</h2>
      <p className="small">Students: Username/Password = Admission Number</p>
      <div style={{ display: "grid", gap: 8 }}>
        <input className="input" placeholder="Username or Email" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn" onClick={login}>Sign In</button>
        <div className="small">{msg}</div>
      </div>
    </div>
  );
}
