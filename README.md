# SHA — Smart Hustle Assistant

**Know your profit. Never run out of stock.**

A mobile-first web app for tuckshop, salon and market traders in Harare. Owners record sales, expenses and restocks by typing short chat-style messages. SHA answers in plain English: how much money came in, how much profit was earned, and what is about to run out.

This is a working university Technopreneurship prototype. Price target: **US$3 / month**.

## Assumptions

- One owner = one business (no staff accounts yet).
- Currency is USD (common for pricing in Harare); amounts always show as `$` with 2 decimals.
- Zimbabwe phone numbers are stored as `07XXXXXXXX`.
- Dates use Africa/Harare (`+02:00`) so “today” matches local shop hours.
- The chat parser is **rule-based** (keywords + fuzzy product names). It works without the internet and without an AI API.
- Selling more than you have is blocked. SHA offers to sell only what is left.
- Restocking updates the product’s cost price to the latest unit cost (simple last-cost, not a full weighted-average ledger).
- The EcoCash “Pay US$3” screen is a simulation. No money is collected.
- Demo data is randomised with a fixed seed so the dashboard tells the same story each reset: thin-margin cash vs profit, a slow seller (Sugar), and Cooking Oil nearly out.

## Features

- Phone + password login (JWT cookie and Bearer token)
- Onboarding: business + 3 or more products, with sample catalogues per business type
- WhatsApp-style chat recorder: sales, expenses, restocks, withdrawals, questions, undo
- Fuzzy product matching and optional Shona keywords (`ndatengesa`, `ndatenga`, `ndashandisa`)
- Home dashboard: today’s cash, profit, expenses, cash-vs-profit card, tips, low-stock banner
- Stock list with colour bars and days-left estimate
- Reports (today / week / month) with a bar chart
- Printable 30-day **Business Performance Summary** for lenders
- Free vs Standard plan with a mock EcoCash upgrade
- Installable PWA (manifest + service worker)
- Reset demo data for the class demo account

## Tech stack

| Layer | Choice |
| --- | --- |
| Database | MySQL 8, InnoDB, utf8mb4 |
| API | Node.js, Express, ES modules, mysql2/promise, Zod, Helmet, CORS, rate-limit, bcrypt, JWT |
| Web app | React 18, Vite, Tailwind CSS, React Router, Recharts (lazy-loaded) |
| Tests | Vitest (chat parser, 25+ messages) |

## Architecture

```
[Phone browser / PWA]
        |  JSON + Bearer or cookie
[Express REST API  /api ]
        |  controllers -> services -> pool (parameterised SQL)
[MySQL  sha_db]
        tables: users, businesses, products, sales, expenses,
                stock_purchases, owner_withdrawals, chat_messages
```

A sale runs in one transaction: insert `sales` **and** reduce `products.stock_qty`.  
A restock runs in one transaction: insert `stock_purchases`, increase stock, update `cost_price`.

Profit rules (implemented exactly):

- Cash received = sum of `sales.total`
- Gross profit = sum of `quantity * (unit_price - unit_cost)`
- Net profit = gross profit − expenses
- Restocks are **not** expenses
- Owner withdrawals are **not** expenses (shown separately)

## Project layout

```
/client     React PWA
/server     Express API
/database   schema.sql, seed.sql
README.md
```

## MySQL setup (Windows)

### Option A — XAMPP

1. Install [XAMPP](https://www.apachefriends.org/) and start **MySQL** from the control panel (`mysql_start.bat` or the Start button). Port 3306 must be listening.
2. Default login is usually `root` with an **empty** password on `127.0.0.1:3306`.
3. You do **not** need to create the database by hand. `npm run migrate` creates `sha_db`.

### Option B — MySQL Workbench / official installer

1. Install MySQL 8 and note the root password.
2. Copy `.env.example` to `server/.env` and set `DB_PASSWORD`.

Optional: open `database/schema.sql` then `database/seed.sql` in Workbench. Prefer `npm run setup` so the demo password is hashed and 30 days of history are generated.

## Environment

Copy `.env.example` to `server/.env`:

```
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=sha_db
DB_PORT=3306
JWT_SECRET=change-me-to-a-long-random-string
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

## How to run

```bat
cd C:\Users\USER\Desktop\SHA
npm run install:all
npm run setup
npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:4000/api/health  

`npm run setup` = migrate + seed.  
`npm run test` runs parser unit tests.  
`npm run seed` rebuilds the demo shop and **removes other test accounts**. Use Settings → Reset demo data on the demo login for the same effect.

## Hosting

The live site and API run as **one Node app**. After build, Express serves the React files from `client/dist` (or `public` in the hosting pack).

### 1. Make the upload folder

```bat
cd C:\Users\USER\Desktop\SHA
npm run prepare:hosting
```

This builds the website and writes `C:\Users\USER\Desktop\SHA\hosting`. Zip and upload that folder.

### 2. On the host (Render, Railway, VPS, or cPanel Node)

1. The host must have **Node.js 18+** and a reachable **MySQL 8** database.
2. Copy `hosting/.env.example` to `hosting/.env`.
3. Set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, a long `JWT_SECRET`, `PORT` (hosts often set this for you), and `CLIENT_ORIGIN` to your public URL (example `https://your-app.onrender.com`).
4. `NODE_ENV=production`
5. Install and start:

```bat
cd hosting
npm install --omit=dev
npm run setup
npm start
```

### 3. From this repo (no extra folder)

```bat
npm run install:all
npm run build
npm run setup
set NODE_ENV=production
npm start
```

Then open `http://YOUR-SERVER:4000` (or the port the host assigns).

### Notes

- Same-origin hosting is the default: the browser calls `/api` on the same site. Leave `VITE_API_URL` empty.
- If the website and API are on different domains, set `VITE_API_URL` before `npm run build`, set `CLIENT_ORIGIN` to the website URL, and `COOKIE_SAMESITE=none` (HTTPS required).
- Change `JWT_SECRET` before you go live.
- `npm run seed` on the host loads the demo shop (`0771234567` / `Demo@1234`).

## Demo login

| | |
| --- | --- |
| Phone | `0771234567` |
| Password | `Demo@1234` |
| Business | Mai Tendai's Tuckshop, Glen View, Harare |

On first load you should see: money received higher than profit, Cooking Oil low, Sugar sitting on the shelf.

## Parser cheat-sheet

| You type | SHA does |
| --- | --- |
| `sold 3 bread` | Sale |
| `sold bread 3` | Sale |
| `sold 2 oil at 3.50` | Sale at a custom price |
| `3 bread sold` | Sale |
| `spent 5 on transport` | Expense |
| `paid 20 rent` | Expense |
| `airtime 2` | Expense (airtime / data) |
| `bought 20 bread at 0.50` | Restock (not an expense) |
| `restocked 10 sugar 1.20 each` | Restock |
| `took 10 for home` | Withdrawal (not an expense) |
| `withdrew 5` | Withdrawal |
| `profit today` / `profit this week` | Question |
| `what is low` / `stock` / `best seller` | Question |
| `how much did I sell today` | Question |
| `undo` | Reverse last record + restore stock |
| `ndatengesa 2 bread` | Shona: sold |
| `ndatenga 8 rice` | Shona: bought |
| `ndashandisa 3 kombi` | Shona: spent |

If SHA is unsure it asks a short question and shows tap buttons.

## API list

Prefix: `/api`

**Auth** — `POST /auth/register` `POST /auth/login` `GET /auth/me` `POST /auth/logout` `POST /auth/change-password`  
**Business** — `POST /business` `GET /business` `PUT /business`  
**Products** — `GET/POST /products` `POST /products/bulk` `PUT/DELETE /products/:id` `GET /products/samples`  
**Chat** — `POST /chat` `GET /chat/history`  
**Records** — `GET/POST /sales` `GET/POST /expenses` `GET/POST /purchases` `GET/POST /withdrawals` + `DELETE` each  
**Reports** — `GET /reports/summary?period=today\|week\|month` `GET /reports/top-products` `GET /reports/low-stock` `GET /reports/insights` `GET /reports/lender-summary` `GET /reports/charts`  
**Plan** — `POST /plan/upgrade` (mock)  
**Demo** — `POST /demo/reset` (demo user only)

Errors: `{ "error": "message" }` with 4xx/5xx status codes. All business routes are scoped to the logged-in user’s business.

## Known limitations

- One business per user; no branches or staff logins
- Parser is rules + fuzzy match, not a language model
- No offline write-queue (PWA caches the app shell only)
- EcoCash upgrade is fake
- Last-cost on restock, not full inventory accounting
- Stock edit from the Stock screen needs cost/price filled in if you add a new product

## Future work

- Real WhatsApp integration
- Real EcoCash / payment gateway
- AI/LLM-based parsing
- Multi-branch businesses
- Offline-first sync
- Multiple staff accounts
- Push notifications

## Quality checklist (class demo)

1. Log in as Mai Tendai — dashboard shows cash vs profit and a low-stock banner  
2. Chat: `sold 3 bread` → confirmation + Undo  
3. Chat: `spent 5 on transport` → saved  
4. Chat: `bought 4 oil at 3.20` → stock rises  
5. Chat: `undo` → last action reversed  
6. Stock page: Cooking Oil is red / amber  
7. Reports: toggle Today / Week / Month, chart loads  
8. Lender page: print / Save as PDF  
9. Plan: mock EcoCash US$3  
10. Settings: Reset demo data
