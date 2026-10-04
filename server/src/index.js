import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';

const app = createApp();

// Always bind all interfaces. Railway/Nixpacks may set HOST to a hostname
// that cannot be used with listen() and that crash looks like "Online → Crashed".
const bindHost = '0.0.0.0';
const server = app.listen(env.port, bindHost, async () => {
  console.log(`SHA listening on http://${bindHost}:${env.port} (${env.nodeEnv})`);
  try {
    await pool.query('SELECT 1');
    console.log('MySQL connection ok.');
  } catch (err) {
    console.error('MySQL is not reachable yet:', err.message);
    console.error('Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT from the Railway MySQL plugin.');
  }
});

server.on('error', (err) => {
  console.error('Server failed to bind:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
