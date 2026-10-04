import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

/** Shared connection pool. All queries go through here. */
export const pool = mysql.createPool({
  host: env.db.host,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  port: env.db.port,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false,
  timezone: '+02:00',
  dateStrings: false,
  charset: 'utf8mb4',
});

const rawPool = pool.pool || pool;
if (typeof rawPool.on === 'function') {
  rawPool.on('connection', (connection) => {
    connection.query("SET time_zone = '+02:00'");
  });
}

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
