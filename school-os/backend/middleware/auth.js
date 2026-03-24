import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { query } from "../db.js";

export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    const result = await query(
      `SELECT u.id, u.username, u.email, u.is_active, r.code AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) return res.status(401).json({ message: "Invalid session" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
