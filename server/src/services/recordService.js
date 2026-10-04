import { query, withTransaction } from '../db/pool.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { money, nowStamp } from '../utils/money.js';
import { getOwnedProduct, mapProduct } from './productService.js';

/** Last mutating action per business, used by chat "undo". */
const lastActions = new Map();

function rememberAction(businessId, type, id) {
  lastActions.set(businessId, { type, id, at: Date.now() });
}

function forgetAction(businessId, type, id) {
  const last = lastActions.get(businessId);
  if (last && last.type === type && last.id === id) lastActions.delete(businessId);
}

function periodClause(column, period) {
  if (period === 'today') return ` AND ${column} >= CURDATE() AND ${column} < CURDATE() + INTERVAL 1 DAY`;
  if (period === 'week') return ` AND ${column} >= CURDATE() - INTERVAL 6 DAY`;
  if (period === 'month') return ` AND ${column} >= CURDATE() - INTERVAL 29 DAY`;
  return '';
}

export async function listSales(businessId, period) {
  const extra = periodClause('s.sold_at', period);
  return query(
    `SELECT s.*, p.name AS product_name
     FROM sales s
     JOIN products p ON p.id = s.product_id
     WHERE s.business_id = ? ${extra}
     ORDER BY s.sold_at DESC
     LIMIT 200`,
    [businessId],
  );
}

export async function listExpenses(businessId, period) {
  const extra = periodClause('spent_at', period);
  return query(
    `SELECT * FROM expenses WHERE business_id = ? ${extra} ORDER BY spent_at DESC LIMIT 200`,
    [businessId],
  );
}

export async function listPurchases(businessId, period) {
  const extra = periodClause('sp.purchased_at', period);
  return query(
    `SELECT sp.*, p.name AS product_name
     FROM stock_purchases sp
     JOIN products p ON p.id = sp.product_id
     WHERE sp.business_id = ? ${extra}
     ORDER BY sp.purchased_at DESC
     LIMIT 200`,
    [businessId],
  );
}

export async function listWithdrawals(businessId, period) {
  const extra = periodClause('taken_at', period);
  return query(
    `SELECT * FROM owner_withdrawals WHERE business_id = ? ${extra} ORDER BY taken_at DESC LIMIT 200`,
    [businessId],
  );
}

/**
 * Record a sale and reduce stock in one transaction.
 * Blocks if stock would go negative unless confirmNegative is true
 * (then we still refuse to go below zero — we sell only what is left).
 */
export async function recordSale(businessId, data) {
  return withTransaction(async (conn) => {
    const [products] = await conn.execute(
      'SELECT * FROM products WHERE id = ? AND business_id = ? AND is_active = 1 FOR UPDATE',
      [data.productId, businessId],
    );
    if (!products.length) throw notFound('Product not found.');
    const product = products[0];
    const qty = money(data.quantity);
    const available = money(product.stock_qty);

    if (available <= 0) {
      throw badRequest(`${product.name} is out of stock. Restock first.`, {
        code: 'OUT_OF_STOCK',
        productName: product.name,
        available: 0,
      });
    }
    if (qty > available && !data.confirmNegative) {
      throw badRequest(
        `You only have ${available} ${product.name} left. Sell ${available} or restock first.`,
        {
          code: 'LOW_STOCK',
          available,
          productName: product.name,
          requested: qty,
        },
      );
    }

    const soldQty = qty > available ? available : qty;

    const unitPrice = money(data.unitPrice ?? product.selling_price);
    const unitCost = money(product.cost_price);
    const total = money(soldQty * unitPrice);
    const soldAt = nowStamp(data.soldAt);

    const [result] = await conn.execute(
      `INSERT INTO sales
        (business_id, product_id, quantity, unit_price, unit_cost, total, sold_at, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [businessId, product.id, soldQty, unitPrice, unitCost, total, soldAt, data.source || 'form'],
    );

    const newStock = money(available - soldQty);
    await conn.execute(
      'UPDATE products SET stock_qty = ? WHERE id = ? AND business_id = ?',
      [newStock, product.id, businessId],
    );

    const record = {
      id: result.insertId,
      type: 'sale',
      productId: product.id,
      productName: product.name,
      quantity: soldQty,
      unitPrice,
      unitCost,
      total,
      stockLeft: newStock,
      source: data.source || 'form',
    };
    rememberAction(businessId, 'sale', record.id);
    return record;
  });
}

/** Restock: insert purchase, increase stock, update product cost_price. */
export async function recordPurchase(businessId, data) {
  return withTransaction(async (conn) => {
    const [products] = await conn.execute(
      'SELECT * FROM products WHERE id = ? AND business_id = ? AND is_active = 1 FOR UPDATE',
      [data.productId, businessId],
    );
    if (!products.length) throw notFound('Product not found.');
    const product = products[0];
    const qty = money(data.quantity);
    const unitCost = money(data.unitCost);
    const totalCost = money(qty * unitCost);

    const [result] = await conn.execute(
      `INSERT INTO stock_purchases
        (business_id, product_id, quantity, unit_cost, total_cost, purchased_at, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [businessId, product.id, qty, unitCost, totalCost, nowStamp(data.purchasedAt), data.source || 'form'],
    );

    const newStock = money(Number(product.stock_qty) + qty);
    await conn.execute(
      'UPDATE products SET stock_qty = ?, cost_price = ? WHERE id = ? AND business_id = ?',
      [newStock, unitCost, product.id, businessId],
    );

    const record = {
      id: result.insertId,
      type: 'restock',
      productId: product.id,
      productName: product.name,
      quantity: qty,
      unitCost,
      totalCost,
      stockLeft: newStock,
      source: data.source || 'form',
    };
    rememberAction(businessId, 'restock', record.id);
    return record;
  });
}

export async function recordExpense(businessId, data) {
  const result = await query(
    `INSERT INTO expenses (business_id, category, description, amount, spent_at, source)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      businessId,
      data.category,
      data.description || '',
      money(data.amount),
      nowStamp(data.spentAt),
      data.source || 'form',
    ],
  );
  const record = {
    id: result.insertId,
    type: 'expense',
    category: data.category,
    description: data.description || '',
    amount: money(data.amount),
    source: data.source || 'form',
  };
  rememberAction(businessId, 'expense', record.id);
  return record;
}

export async function recordWithdrawal(businessId, data) {
  const result = await query(
    `INSERT INTO owner_withdrawals (business_id, amount, note, taken_at)
     VALUES (?, ?, ?, ?)`,
    [businessId, money(data.amount), data.note || '', nowStamp(data.takenAt)],
  );
  const record = {
    id: result.insertId,
    type: 'withdrawal',
    amount: money(data.amount),
    note: data.note || '',
  };
  rememberAction(businessId, 'withdrawal', record.id);
  return record;
}

export async function deleteSale(businessId, id) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute(
      'SELECT * FROM sales WHERE id = ? AND business_id = ? FOR UPDATE',
      [id, businessId],
    );
    if (!rows.length) throw notFound('Sale not found.');
    const sale = rows[0];
    await conn.execute(
      'UPDATE products SET stock_qty = stock_qty + ? WHERE id = ? AND business_id = ?',
      [sale.quantity, sale.product_id, businessId],
    );
    await conn.execute('DELETE FROM sales WHERE id = ? AND business_id = ?', [id, businessId]);
    forgetAction(businessId, 'sale', id);
    return { ok: true, type: 'sale', restoredQty: money(sale.quantity), productId: sale.product_id };
  });
}

export async function deletePurchase(businessId, id) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute(
      'SELECT * FROM stock_purchases WHERE id = ? AND business_id = ? FOR UPDATE',
      [id, businessId],
    );
    if (!rows.length) throw notFound('Purchase not found.');
    const purchase = rows[0];
    const [products] = await conn.execute(
      'SELECT * FROM products WHERE id = ? AND business_id = ? FOR UPDATE',
      [purchase.product_id, businessId],
    );
    if (products.length && Number(products[0].stock_qty) < Number(purchase.quantity)) {
      throw badRequest('Cannot undo this restock. Some of that stock has already been sold.');
    }
    await conn.execute(
      'UPDATE products SET stock_qty = stock_qty - ? WHERE id = ? AND business_id = ?',
      [purchase.quantity, purchase.product_id, businessId],
    );
    await conn.execute('DELETE FROM stock_purchases WHERE id = ? AND business_id = ?', [id, businessId]);
    forgetAction(businessId, 'restock', id);
    return { ok: true, type: 'restock', productId: purchase.product_id };
  });
}

export async function deleteExpense(businessId, id) {
  const rows = await query('SELECT id FROM expenses WHERE id = ? AND business_id = ?', [id, businessId]);
  if (!rows.length) throw notFound('Expense not found.');
  await query('DELETE FROM expenses WHERE id = ? AND business_id = ?', [id, businessId]);
  forgetAction(businessId, 'expense', id);
  return { ok: true, type: 'expense' };
}

export async function deleteWithdrawal(businessId, id) {
  const rows = await query('SELECT id FROM owner_withdrawals WHERE id = ? AND business_id = ?', [id, businessId]);
  if (!rows.length) throw notFound('Withdrawal not found.');
  await query('DELETE FROM owner_withdrawals WHERE id = ? AND business_id = ?', [id, businessId]);
  forgetAction(businessId, 'withdrawal', id);
  return { ok: true, type: 'withdrawal' };
}

export async function undoLastAction(businessId) {
  const remembered = lastActions.get(businessId);
  if (remembered) {
    lastActions.delete(businessId);
    return undoByType(businessId, remembered.type, remembered.id);
  }

  const messages = await query(
    `SELECT parsed_action FROM chat_messages
     WHERE business_id = ? AND sender = 'sha'
       AND parsed_action IN ('sale','expense','restock','withdrawal')
     ORDER BY id DESC LIMIT 1`,
    [businessId],
  );
  if (messages.length) {
    const kind = messages[0].parsed_action;
    const latest = await latestOfKind(businessId, kind);
    if (latest) return undoByType(businessId, kind, latest.id);
  }

  throw badRequest('Nothing to undo yet.');
}

async function latestOfKind(businessId, kind) {
  const table = {
    sale: ['sales', 'sold_at'],
    expense: ['expenses', 'spent_at'],
    restock: ['stock_purchases', 'purchased_at'],
    withdrawal: ['owner_withdrawals', 'taken_at'],
  }[kind];
  if (!table) return null;
  const rows = await query(
    `SELECT id FROM ${table[0]} WHERE business_id = ? ORDER BY ${table[1]} DESC, id DESC LIMIT 1`,
    [businessId],
  );
  return rows[0] || null;
}

function undoByType(businessId, type, id) {
  if (type === 'sale') return deleteSale(businessId, id);
  if (type === 'expense') return deleteExpense(businessId, id);
  if (type === 'restock') return deletePurchase(businessId, id);
  return deleteWithdrawal(businessId, id);
}

export { getOwnedProduct, mapProduct };
