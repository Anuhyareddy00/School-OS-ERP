const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch(path, { method = "GET", token, body } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error("Cannot reach API server. Ensure backend is running on http://localhost:8000.");
  }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    let message = "Request failed";
    if (typeof data === "string") {
      message = data;
    } else if (Array.isArray(data?.detail)) {
      message = data.detail.map((x) => x.msg).join(", ");
    } else {
      message = data?.detail || data?.message || "Request failed";
    }
    throw new Error(message);
  }
  return data;
}

export async function apiUpload(path, { token, formData }) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    });
  } catch {
    throw new Error("Cannot reach API server. Ensure backend is running on http://localhost:8000.");
  }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    let message = "Upload failed";
    if (typeof data === "string") {
      message = data;
    } else if (Array.isArray(data?.detail)) {
      message = data.detail.map((x) => x.msg).join(", ");
    } else {
      message = data?.detail || data?.message || "Upload failed";
    }
    throw new Error(message);
  }
  return data;
}
