import pg from "pg";
import { env } from "./config/env.js";

const { Pool } = pg;

if (!env.DATABASE_URL) {
  console.warn("[WARN] DATABASE_URL is not set. DB calls will fail until configured.");
}

export const pool = new Pool({ connectionString: env.DATABASE_URL });

export async function query(text, params = []) {
  return pool.query(text, params);
}
