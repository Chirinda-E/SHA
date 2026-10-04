import { query } from '../db/pool.js';
import { conflict, notFound } from '../utils/httpError.js';
import { SAMPLE_PRODUCTS } from '../data/sampleProducts.js';

export function mapBusiness(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    location: row.location,
    currency: row.currency,
    createdAt: row.created_at,
  };
}

export async function createBusiness(userId, data) {
  const existing = await query('SELECT id FROM businesses WHERE user_id = ? LIMIT 1', [userId]);
  if (existing.length) {
    throw conflict('You already have a business. Edit it in Settings.');
  }
  const result = await query(
    'INSERT INTO businesses (user_id, name, type, location, currency) VALUES (?, ?, ?, ?, ?)',
    [userId, data.name, data.type, data.location || '', data.currency || 'USD'],
  );
  const rows = await query('SELECT * FROM businesses WHERE id = ?', [result.insertId]);
  return mapBusiness(rows[0]);
}

export async function getBusinessForUser(userId) {
  const rows = await query('SELECT * FROM businesses WHERE user_id = ? LIMIT 1', [userId]);
  if (!rows.length) throw notFound('No business found. Finish onboarding first.');
  return mapBusiness(rows[0]);
}

export async function updateBusiness(userId, data) {
  const current = await getBusinessForUser(userId);
  await query(
    'UPDATE businesses SET name = ?, type = ?, location = ?, currency = ? WHERE id = ? AND user_id = ?',
    [data.name, data.type, data.location || '', data.currency || 'USD', current.id, userId],
  );
  return getBusinessForUser(userId);
}

export function sampleProductsFor(type) {
  return SAMPLE_PRODUCTS[type] || SAMPLE_PRODUCTS.other;
}
