import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { databaseFile } from '../utils/paths.js';

export async function migrate() {
  const schemaPath = databaseFile('schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');

  const conn = await mysql.createConnection({
    host: env.db.host,
    user: env.db.user,
    password: env.db.password,
    port: env.db.port,
    multipleStatements: true,
  });

  try {
    await conn.query(sql);
    console.log('Database schema applied (sha_db).');
  } finally {
    await conn.end();
  }
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  migrate().catch((err) => {
    console.error('Migrate failed:', err.message);
    process.exit(1);
  });
}
