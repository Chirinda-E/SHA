import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../utils/password.js';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { money } from '../utils/money.js';
import { databaseFile } from '../utils/paths.js';

const DEMO_PHONE = '0771234567';
const DEMO_PASSWORD = 'Demo@1234';

/** Seeded PRNG so demo data is interesting and repeatable. */
function makeRng(seed = 20261004) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pickInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function isoDay(offsetDays, hour = 10, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d;
}

function sqlDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function seed() {
  const hash = await hashPassword(DEMO_PASSWORD);
  const seedPath = databaseFile('seed.sql');
  let sql = await fs.readFile(seedPath, 'utf8');
  sql = sql.replace(/\$2b\$10\$REPLACE_ME_IN_NODE_SEED\.+/, () => hash);

  const conn = await mysql.createConnection({
    host: env.db.host,
    user: env.db.user,
    password: env.db.password,
    port: env.db.port,
    database: env.db.database,
    multipleStatements: true,
    timezone: '+02:00',
  });
  await conn.query("SET time_zone = '+02:00'");

  try {
    await conn.query(sql);
    await generateHistory(conn);
    console.log(`Demo user ready: ${DEMO_PHONE} / ${DEMO_PASSWORD}`);
    console.log('30 days of sales, expenses, restocks and withdrawals generated.');
  } finally {
    await conn.end();
  }
}

/**
 * Builds a first-load story:
 * - Cooking Oil is almost out
 * - Sugar is a slow seller with plenty on the shelf
 * - Cash received is clearly higher than profit (thin-margin airtime + bread)
 */
async function generateHistory(conn) {
  const rng = makeRng(771234567);
  const products = [
    { id: 1, name: 'Bread', cost: 0.8, price: 1.0, start: 25, daily: [2, 4], weekendBoost: 1.4, restockEvery: 6, restockQty: 28, floor: 16 },
    { id: 2, name: 'Cooking Oil 2L', cost: 3.2, price: 3.8, start: 8, daily: [0, 1], weekendBoost: 1, restockEvery: 0, restockQty: 0, floor: 0 },
    { id: 3, name: 'Sugar 2kg', cost: 2.4, price: 2.9, start: 15, daily: [0, 0], weekendBoost: 1, restockEvery: 0, restockQty: 0, floor: 0 },
    { id: 4, name: 'Maputi', cost: 0.3, price: 0.5, start: 40, daily: [1, 3], weekendBoost: 1.3, restockEvery: 10, restockQty: 20, floor: 12 },
    { id: 5, name: 'Eggs (tray)', cost: 3.5, price: 4.2, start: 6, daily: [0, 1], weekendBoost: 1, restockEvery: 14, restockQty: 4, floor: 2 },
    { id: 6, name: 'Airtime $1', cost: 0.9, price: 1.0, start: 60, daily: [2, 5], weekendBoost: 1.2, restockEvery: 6, restockQty: 28, floor: 20 },
    { id: 7, name: 'Mazoe Orange', cost: 1.8, price: 2.2, start: 12, daily: [0, 1], weekendBoost: 1.3, restockEvery: 12, restockQty: 8, floor: 4 },
    { id: 8, name: 'Rice 2kg', cost: 2.5, price: 3.0, start: 10, daily: [0, 1], weekendBoost: 1.1, restockEvery: 14, restockQty: 6, floor: 4 },
  ];

  const stock = Object.fromEntries(products.map((p) => [p.id, p.start]));
  const saleRows = [];
  const purchaseRows = [];
  const expenseRows = [];
  const withdrawalRows = [];
  const chatRows = [];

  for (let day = 30; day >= 0; day -= 1) {
    const when = isoDay(day, 8, 15);
    const dow = when.getDay();
    const isWeekend = dow === 0 || dow === 6;

    for (const p of products) {
      if (!p.restockEvery || day === 0 || day % p.restockEvery !== 0) continue;
      const boughtAt = isoDay(day, 6, 30);
      purchaseRows.push([
        1,
        p.id,
        p.restockQty,
        p.cost,
        money(p.restockQty * p.cost),
        sqlDate(boughtAt),
        'form',
      ]);
      stock[p.id] += p.restockQty;
    }

    for (const p of products) {
      let qty = pickInt(rng, p.daily[0], p.daily[1]);
      if (p.id === 3) qty = rng() < 0.12 ? 1 : 0;
      if (p.id === 2) qty = day !== 0 && day % 5 === 0 ? 1 : 0;
      if (day === 0 && p.id === 1) qty = 6;
      if (day === 0 && p.id === 6) qty = 8;
      if (day === 0 && p.id === 4) qty = 4;
      if (day === 0 && p.id === 7) qty = 2;
      if (day === 0 && p.id === 2) qty = 0;
      if (day === 0 && p.id === 5) qty = 1;
      if (isWeekend && day !== 0) qty = Math.round(qty * p.weekendBoost);
      if (qty <= 0) continue;
      const available = Math.max(0, stock[p.id] - (p.floor || 0));
      if (available < qty) qty = Math.floor(available);
      if (qty <= 0) continue;

      const hour = day === 0 ? pickInt(rng, 7, 16) : pickInt(rng, 7, 18);
      const soldAt = isoDay(day, hour, pickInt(rng, 0, 59));
      saleRows.push([
        1,
        p.id,
        qty,
        p.price,
        p.cost,
        money(qty * p.price),
        sqlDate(soldAt),
        'form',
      ]);
      stock[p.id] -= qty;
    }

    const transport = money(day === 0 ? 2 : 1 + rng() * 0.8);
    expenseRows.push([1, 'transport', 'Kombi to Mbare / Glen View', transport, sqlDate(isoDay(day, 7, 10)), 'form']);
    if (day !== 0 && day % 3 === 0) {
      expenseRows.push([1, 'airtime_data', 'EcoCash / WhatsApp data', 1, sqlDate(isoDay(day, 20, 5)), 'form']);
    }
    if (dow === 1 && day !== 0) {
      expenseRows.push([1, 'electricity', 'ZESA units', money(2.5 + rng()), sqlDate(isoDay(day, 18, 0)), 'form']);
    }
    if (day === 21 || day === 7) {
      expenseRows.push([1, 'supplies', 'Plastic bags and wrapping', 2, sqlDate(isoDay(day, 11, 0)), 'form']);
    }
  }

  // Story: oil almost out, sugar barely moving, bread still sellable
  stock[2] = 2;
  stock[3] = Math.max(stock[3], 12);
  if (stock[1] < 16) stock[1] = 18;

  withdrawalRows.push([1, 20.0, 'School bus fare and bread at home', sqlDate(isoDay(24, 19, 0))]);
  withdrawalRows.push([1, 15.0, 'Vegetables and relish', sqlDate(isoDay(16, 19, 20))]);
  withdrawalRows.push([1, 25.0, 'Rent contribution', sqlDate(isoDay(8, 18, 40))]);
  withdrawalRows.push([1, 10.0, 'Airtime for Tendai', sqlDate(isoDay(3, 17, 10))]);

  chatRows.push([1, 'sha', 'Welcome back, Mai Tendai. Type a sale like "sold 3 bread".', 'welcome', sqlDate(isoDay(0, 7, 0))]);

  if (saleRows.length) {
    await conn.query(
      `INSERT INTO sales (business_id, product_id, quantity, unit_price, unit_cost, total, sold_at, source)
       VALUES ${saleRows.map(() => '(?,?,?,?,?,?,?,?)').join(',')}`,
      saleRows.flat(),
    );
  }
  if (purchaseRows.length) {
    await conn.query(
      `INSERT INTO stock_purchases (business_id, product_id, quantity, unit_cost, total_cost, purchased_at, source)
       VALUES ${purchaseRows.map(() => '(?,?,?,?,?,?,?)').join(',')}`,
      purchaseRows.flat(),
    );
  }
  if (expenseRows.length) {
    await conn.query(
      `INSERT INTO expenses (business_id, category, description, amount, spent_at, source)
       VALUES ${expenseRows.map(() => '(?,?,?,?,?,?)').join(',')}`,
      expenseRows.flat(),
    );
  }
  if (withdrawalRows.length) {
    await conn.query(
      `INSERT INTO owner_withdrawals (business_id, amount, note, taken_at)
       VALUES ${withdrawalRows.map(() => '(?,?,?,?)').join(',')}`,
      withdrawalRows.flat(),
    );
  }
  await conn.query(
    `INSERT INTO chat_messages (business_id, sender, message, parsed_action, created_at)
     VALUES (?,?,?,?,?)`,
    chatRows[0],
  );

  for (const p of products) {
    await conn.query('UPDATE products SET stock_qty = ? WHERE id = ?', [money(Math.max(0, stock[p.id])), p.id]);
  }

  // Guarantee oil is the low-stock hero of the dashboard
  await conn.query('UPDATE products SET stock_qty = ? WHERE id = 2', [2]);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  seed().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
}
