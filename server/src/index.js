import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';

const app = createApp();

const server = app.listen(env.port, env.host, async () => {
  console.log(`SHA listening on http://${env.host}:${env.port} (${env.nodeEnv})`);
  try {
    await pool.query('SELECT 1');
    console.log('MySQL connection ok.');
  } catch (err) {
    console.error('MySQL is not reachable yet:', err.message);
    console.error('Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT from the Railway MySQL service.');
  }
});

server.on('error', (err) => {
  console.error('Server failed to bind:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
