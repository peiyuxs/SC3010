import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool() {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to your .env.local file.");
  }

  pool = new Pool({
    connectionString,
  });

  return pool;
}
