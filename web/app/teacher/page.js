"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeacherPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/portal");
  }, [router]);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Redirecting to Shared Portal</h2>
      <p>Teacher workflows are available in the unified `/portal`.</p>
    </div>
  );
}
