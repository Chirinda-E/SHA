SHA hosting pack
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
