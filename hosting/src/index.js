import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';

const app = createApp();

app.listen(env.port, env.host, async () => {
  try {
    await pool.query('SELECT 1');
    console.log(`SHA listening on http://${env.host}:${env.port} (${env.nodeEnv})`);
  } catch (err) {
    console.error('API started but MySQL is not reachable:', err.message);
    console.error('Check DB_* in .env and that MySQL is running.');
  }
});
