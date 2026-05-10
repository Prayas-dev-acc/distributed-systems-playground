import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on("error", (err) => {
  console.error("[DB] Unexpected error on idle client:", err);
});

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log(`[DB] query: ${text.slice(0, 60)} | rows: ${res.rowCount} | ${duration}ms`);
  return res;
}

export async function getClient() {
  return pool.connect();
}

export default pool;
