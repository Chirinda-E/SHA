import { query } from '../db/pool.js';
import { parseMessage, friendlyConfirm } from './parser.js';
import {
  recordSale,
  recordExpense,
  recordPurchase,
  recordWithdrawal,
  undoLastAction,
} from './recordService.js';
import { listProducts } from './productService.js';
import { getSummary, getTopProducts, getLowStock } from './reportService.js';
import { formatMoney, money } from '../utils/money.js';
import { HttpError } from '../utils/httpError.js';

const pendingByBusiness = new Map();

export async function saveMessage(businessId, sender, message, parsedAction = null) {
  const result = await query(
    'INSERT INTO chat_messages (business_id, sender, message, parsed_action) VALUES (?, ?, ?, ?)',
    [businessId, sender, message, parsedAction],
  );
  return { id: result.insertId, businessId, sender, message, parsedAction, createdAt: new Date().toISOString() };
}

export async function getHistory(businessId, limit = 80) {
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 80));
  const rows = await query(
    `SELECT * FROM chat_messages
     WHERE business_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ${safeLimit}`,
    [businessId],
  );
  return rows.reverse().map((r) => ({
    id: r.id,
    sender: r.sender,
    message: r.message,
    parsedAction: r.parsed_action,
    createdAt: r.created_at,
  }));
}

export async function handleChat(businessId, rawMessage, { confirm = false } = {}) {
  const products = await listProducts(businessId);
  const productRows = products.map((p) => ({
    id: p.id,
    name: p.name,
    aliases: p.aliases,
    selling_price: p.sellingPrice,
    cost_price: p.costPrice,
    stock_qty: p.stockQty,
  }));

  await saveMessage(businessId, 'user', rawMessage, null);
  const pending = pendingByBusiness.get(businessId);
  const parsed = parseMessage(rawMessage, productRows, { pending });

  if (parsed.intent === 'clarify') {
    pendingByBusiness.set(businessId, parsed.pending);
    const reply = await saveMessage(businessId, 'sha', parsed.reply, 'clarify');
    return {
      parsed,
      reply: reply.message,
      buttons: parsed.buttons || [],
      record: null,
      undo: false,
      messages: [reply],
    };
  }

  pendingByBusiness.delete(businessId);

  try {
    if (parsed.intent === 'sale') {
      const record = await recordSale(businessId, {
        productId: parsed.productId,
        quantity: parsed.quantity,
        unitPrice: parsed.unitPrice,
        confirmNegative: confirm,
        source: 'chat',
      });
      const text = friendlyConfirm(parsed, record);
      const reply = await saveMessage(businessId, 'sha', text, 'sale');
      return { parsed, reply: text, buttons: [{ label: 'Undo', value: 'undo' }], record, undo: true, messages: [reply] };
    }

    if (parsed.intent === 'expense') {
      const record = await recordExpense(businessId, {
        category: parsed.category,
        description: parsed.description,
        amount: parsed.amount,
        source: 'chat',
      });
      const text = friendlyConfirm(parsed);
      const reply = await saveMessage(businessId, 'sha', text, 'expense');
      return { parsed, reply: text, buttons: [{ label: 'Undo', value: 'undo' }], record, undo: true, messages: [reply] };
    }

    if (parsed.intent === 'restock') {
      const product = products.find((p) => p.id === parsed.productId);
      const record = await recordPurchase(businessId, {
        productId: parsed.productId,
        quantity: parsed.quantity,
        unitCost: parsed.unitCost ?? product?.costPrice ?? 0,
        source: 'chat',
      });
      const text = friendlyConfirm(parsed, record);
      const reply = await saveMessage(businessId, 'sha', text, 'restock');
      return { parsed, reply: text, buttons: [{ label: 'Undo', value: 'undo' }], record, undo: true, messages: [reply] };
    }

    if (parsed.intent === 'withdrawal') {
      const record = await recordWithdrawal(businessId, {
        amount: parsed.amount,
        note: parsed.note || 'Taken for home',
      });
      const text = friendlyConfirm(parsed);
      const reply = await saveMessage(businessId, 'sha', text, 'withdrawal');
      return { parsed, reply: text, buttons: [{ label: 'Undo', value: 'undo' }], record, undo: true, messages: [reply] };
    }

    if (parsed.intent === 'undo') {
      const undone = await undoLastAction(businessId);
      const text = `Undone the last ${undone.type}.`;
      const reply = await saveMessage(businessId, 'sha', text, 'undo');
      return { parsed, reply: text, buttons: [], record: undone, undo: false, messages: [reply] };
    }

    if (parsed.intent === 'query') {
      const text = await answerQuery(businessId, parsed);
      const reply = await saveMessage(businessId, 'sha', text, 'query');
      return { parsed, reply: text, buttons: [], record: null, undo: false, messages: [reply] };
    }

    const text = parsed.reply || 'I did not understand. Try: sold 3 bread';
    const reply = await saveMessage(businessId, 'sha', text, 'unknown');
    return { parsed, reply: text, buttons: parsed.buttons || [], record: null, undo: false, messages: [reply] };
  } catch (err) {
    const message = err instanceof HttpError ? err.message : 'I could not save that. Please try again.';
    const extras = err instanceof HttpError ? err.extras : {};
    const buttons = [];
    if (extras.code === 'LOW_STOCK' && extras.available > 0) {
      buttons.push({ label: `Sell ${extras.available} left`, value: `sold ${extras.available} ${extras.productName}` });
    }
    const reply = await saveMessage(businessId, 'sha', message, 'error');
    return { parsed, reply: message, buttons, record: null, undo: false, messages: [reply] };
  }
}

async function answerQuery(businessId, parsed) {
  if (parsed.query === 'profit' || parsed.query === 'sales') {
    const summary = await getSummary(businessId, parsed.period || 'today');
    const label = parsed.period === 'month' ? 'this month' : parsed.period === 'week' ? 'this week' : 'today';
    return [
      `${label[0].toUpperCase()}${label.slice(1)} you received ${formatMoney(summary.cashReceived)} from customers.`,
      `Profit is ${formatMoney(summary.netProfit)} after ${formatMoney(summary.expenses)} expenses.`,
      `You took ${formatMoney(summary.withdrawals)} home (not an expense).`,
    ].join(' ');
  }
  if (parsed.query === 'best') {
    const tops = await getTopProducts(businessId, 'week');
    const best = tops.bestByProfit;
    if (!best || best.profit <= 0) return 'No sales this week yet.';
    return `${best.name} is your best seller this week. It made ${formatMoney(best.profit)} profit from ${best.quantity} sold.`;
  }
  if (parsed.query === 'low') {
    const low = (await getLowStock(businessId)).filter((p) => p.flag);
    if (!low.length) return 'Stock looks fine. Nothing is running out in the next 3 days.';
    return low
      .slice(0, 4)
      .map((p) => {
        const days = p.daysLeft >= 99 ? 'slowly' : `in about ${Math.max(1, Math.round(p.daysLeft))} days`;
        return `${p.name}: ${p.stockQty} left, ${days}. Buy ${p.suggestedRestock || 'more'}.`;
      })
      .join(' ');
  }
  const stock = await getLowStock(businessId);
  return stock
    .slice(0, 8)
    .map((p) => `${p.name} ${p.stockQty}`)
    .join(', ');
}

export function moneyText(n) {
  return formatMoney(money(n));
}
