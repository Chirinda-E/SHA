import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'hosting');

function run(cmd, cwd = root) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
}

const serverPkg = JSON.parse(await readFile(path.join(root, 'server', 'package.json'), 'utf8'));
const deps = { ...serverPkg.dependencies };
delete deps['smart-hustle-assistant'];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

run('npm run build --prefix client');

await cp(path.join(root, 'server', 'src'), path.join(out, 'src'), { recursive: true });
await cp(path.join(root, 'database'), path.join(out, 'database'), { recursive: true });
await cp(path.join(root, 'client', 'dist'), path.join(out, 'public'), { recursive: true });

await writeFile(
  path.join(out, 'package.json'),
  JSON.stringify(
    {
      name: 'sha-hosting',
      version: '1.0.0',
      private: true,
      type: 'module',
      engines: { node: '>=18' },
      scripts: {
        start: 'node src/index.js',
        migrate: 'node src/db/migrate.js',
        seed: 'node src/db/seed.js',
        setup: 'npm run migrate && npm run seed',
      },
      dependencies: deps,
    },
    null,
    2,
  ),
);

await writeFile(
  path.join(out, '.env.example'),
  `# Copy to .env on the host and fill in real values.

NODE_ENV=production
HOST=0.0.0.0
PORT=4000

DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=sha_db
DB_PORT=3306

JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d

# Public URL of this same app (no trailing slash)
CLIENT_ORIGIN=https://your-domain.com

# Use none only if the website and API are on different domains (needs HTTPS)
COOKIE_SAMESITE=lax
`,
);

await writeFile(
  path.join(out, 'README.txt'),
  `SHA hosting pack
================
This folder is a single Node app: the website + the API.

1. Upload this whole folder to your host (Render, Railway, a VPS, or cPanel Node).
2. Copy .env.example to .env and set DB_* , JWT_SECRET, PORT, CLIENT_ORIGIN.
3. npm install --omit=dev
4. npm run setup
5. npm start

The site is served from /public. The API is at /api.
Demo login after seed: 0771234567 / Demo@1234

The host must have Node.js 18+ and a reachable MySQL 8 database.
`,
);

console.log(`\nHosting pack ready: ${out}`);
console.log('Upload the hosting folder, then npm install --omit=dev && npm run setup && npm start');
