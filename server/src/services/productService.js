import { query, withTransaction } from '../db/pool.js';
import { notFound, badRequest } from '../utils/httpError.js';
import { money } from '../utils/money.js';

export function mapProduct(row) {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    aliases: row.aliases || '',
    unit: row.unit,
    costPrice: money(row.cost_price),
    sellingPrice: money(row.selling_price),
    stockQty: money(row.stock_qty),
    reorderLevel: money(row.reorder_level),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

export async function listProducts(businessId, { includeInactive = false } = {}) {
  const sql = includeInactive
    ? 'SELECT * FROM products WHERE business_id = ? ORDER BY name'
    : 'SELECT * FROM products WHERE business_id = ? AND is_active = 1 ORDER BY name';
  const rows = await query(sql, [businessId]);
  return rows.map(mapProduct);
}

export async function getOwnedProduct(businessId, productId, conn = null) {
  const exec = conn ? conn.execute.bind(conn) : (s, p) => query(s, p).then((r) => [r]);
  const [rows] = conn
    ? await exec('SELECT * FROM products WHERE id = ? AND business_id = ? FOR UPDATE', [productId, businessId])
    : [await query('SELECT * FROM products WHERE id = ? AND business_id = ?', [productId, businessId])];
  if (!rows.length) throw notFound('Product not found.');
  return rows[0];
}

export async function createProduct(businessId, data) {
  const result = await query(
    `INSERT INTO products
      (business_id, name, aliases, unit, cost_price, selling_price, stock_qty, reorder_level)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      businessId,
      data.name,
      data.aliases || '',
      data.unit || 'item',
      money(data.costPrice),
      money(data.sellingPrice),
      money(data.stockQty),
      money(data.reorderLevel ?? 0),
    ],
  );
  const rows = await query('SELECT * FROM products WHERE id = ?', [result.insertId]);
  return mapProduct(rows[0]);
}

export async function createManyProducts(businessId, items) {
  const created = [];
  for (const item of items) {
    created.push(await createProduct(businessId, item));
  }
  return created;
}

export async function updateProduct(businessId, productId, data) {
  await getOwnedProduct(businessId, productId);
  await query(
    `UPDATE products
     SET name = ?, aliases = ?, unit = ?, cost_price = ?, selling_price = ?,
         stock_qty = ?, reorder_level = ?
     WHERE id = ? AND business_id = ?`,
    [
      data.name,
      data.aliases || '',
      data.unit || 'item',
      money(data.costPrice),
      money(data.sellingPrice),
      money(data.stockQty),
      money(data.reorderLevel ?? 0),
      productId,
      businessId,
    ],
  );
  const rows = await query('SELECT * FROM products WHERE id = ?', [productId]);
  return mapProduct(rows[0]);
}

export async function deactivateProduct(businessId, productId) {
  await getOwnedProduct(businessId, productId);
  await query('UPDATE products SET is_active = 0 WHERE id = ? AND business_id = ?', [productId, businessId]);
  return { ok: true };
}

export { withTransaction, badRequest };
