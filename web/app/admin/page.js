"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/portal");
  }, [router]);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Redirecting to Shared Portal</h2>
      <p>All admin workflows are now available inside the unified `/portal`.</p>
    </div>
  );
}
