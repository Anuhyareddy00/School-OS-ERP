"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const linksByRole = {
  ADMIN: [
    { href: "/portal", label: "Portal" },
  ],
  TEACHER: [
    { href: "/portal", label: "Portal" },
  ],
  STUDENT: [
    { href: "/portal", label: "Student Portal" },
  ],
  PARENT: [
    { href: "/portal", label: "Parent Portal" },
  ],
};

export default function RoleNav() {
  const [role, setRole] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    setRole(localStorage.getItem("role") || "");
  }, [pathname]);

  const roleLinks = useMemo(() => linksByRole[role] || [], [role]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setRole("");
  };

  return (
    <div className="row">
      <Link href="/">Home</Link>
      {!role && <Link href="/login">Login</Link>}
      {roleLinks.map((item) => (
        <Link key={item.href} href={item.href}>{item.label}</Link>
      ))}
      {role && (
        <>
          <span className="chip">{role}</span>
          <button className="btn" style={{ padding: "6px 10px" }} onClick={logout}>Logout</button>
        </>
      )}
    </div>
  );
}
