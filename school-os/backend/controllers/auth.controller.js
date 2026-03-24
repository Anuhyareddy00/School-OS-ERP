import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query } from "../db.js";
import { env } from "../config/env.js";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const bootstrapSchema = z.object({
  username: z.string().min(3),
  email: z.string().email().optional(),
  password: z.string().min(8)
});

export async function bootstrapAdmin(req, res) {
  const payload = bootstrapSchema.parse(req.body);

  const existingAdmin = await query(
    `SELECT u.id FROM users u
     JOIN roles r ON r.id=u.role_id
     WHERE r.code='ADMIN'
     LIMIT 1`
  );
  if (existingAdmin.rows.length) {
    return res.status(409).json({ message: "Admin already exists. Bootstrap disabled." });
  }

  const role = await query(`SELECT id FROM roles WHERE code='ADMIN' LIMIT 1`);
  const roleId = role.rows[0]?.id;
  if (!roleId) return res.status(500).json({ message: "ADMIN role missing in roles table" });

  const hash = await bcrypt.hash(payload.password, 10);
  const created = await query(
    `INSERT INTO users(role_id, username, email, password_hash)
     VALUES ($1,$2,$3,$4)
     RETURNING id, username, email`,
    [roleId, payload.username, payload.email || null, hash]
  );

  return res.status(201).json({ admin: created.rows[0] });
}

export async function login(req, res) {
  const { username, password } = loginSchema.parse(req.body);

  const result = await query(
    `SELECT u.id, u.username, u.password_hash, u.is_active, r.code AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE lower(u.username) = lower($1) OR lower(u.email) = lower($1)
     LIMIT 1`,
    [username]
  );

  const user = result.rows[0];
  if (!user || !user.is_active) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });

  return res.json({ token, role: user.role, username: user.username });
}

export async function me(req, res) {
  return res.json({ user: req.user });
}
