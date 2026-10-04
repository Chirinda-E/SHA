import { DICTIONARY, EXAMPLE_HINT } from '../data/dictionary.js';
import { money } from '../utils/money.js';

export function levenshtein(a, b) {
  const s = String(a || '').toLowerCase();
  const t = String(b || '').toLowerCase();
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const rows = Array.from({ length: s.length + 1 }, (_, i) => {
    const row = new Array(t.length + 1);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= t.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= s.length; i += 1) {
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost,
      );
    }
  }
  return rows[s.length][t.length];
}

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[$]/g, '')
    .replace(/[,]/g, '')
    .replace(/[^\w.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text, words) {
  return words.some((w) => {
    const re = new RegExp(`\\b${escapeReg(w)}\\b`, 'i');
    return re.test(text);
  });
}

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractNumbers(text) {
  const matches = String(text).match(/\d+(?:\.\d+)?/g);
  return (matches || []).map((n) => Number(n)).filter((n) => Number.isFinite(n));
}

function extractPrice(text) {
  const at = text.match(/(?:at|@|each|for)\s+(\d+(?:\.\d+)?)/i);
  if (at) return money(at[1]);
  const trailing = text.match(/(\d+\.\d{2})\s*(?:each)?$/i);
  if (trailing) return money(trailing[1]);
  return null;
}

function detectPeriod(text) {
  if (hasAny(text, DICTIONARY.periods.month)) return 'month';
  if (hasAny(text, DICTIONARY.periods.week)) return 'week';
  if (hasAny(text, DICTIONARY.periods.today)) return 'today';
  return 'today';
}

function detectCategory(text) {
  for (const [category, words] of Object.entries(DICTIONARY.expenseCategories)) {
    if (hasAny(text, words)) return category;
  }
  return 'other';
}

export function scoreProduct(queryText, product) {
  const q = norm(queryText);
  if (!q) return 0;
  const name = norm(product.name);
  const aliases = String(product.aliases || '')
    .split(',')
    .map((a) => norm(a))
    .filter(Boolean);
  const tokens = name.split(' ');

  if (q === name || aliases.includes(q)) return 100;
  if (tokens.includes(q)) return 92;
  if (name.startsWith(q) || aliases.some((a) => a.startsWith(q))) return 88;
  if (name.includes(q) || aliases.some((a) => a.includes(q))) return 80;
  if (q.includes(name) && name.length >= 3) return 78;

  const nameDist = levenshtein(q, name);
  const aliasDist = aliases.reduce((best, a) => Math.min(best, levenshtein(q, a)), 99);
  const tokenDist = tokens.reduce((best, t) => Math.min(best, levenshtein(q, t)), 99);
  const bestDist = Math.min(nameDist, aliasDist, tokenDist);
  const targetLen = Math.min(name.length, ...aliases.map((a) => a.length), ...tokens.map((t) => t.length), q.length);
  const threshold = targetLen <= 4 ? 1 : targetLen <= 8 ? 2 : 3;
  if (bestDist <= threshold) return 70 - bestDist * 8;
  return 0;
}

export function matchProducts(fragment, products) {
  if (!fragment || !products?.length) return [];
  const scored = products
    .map((p) => ({ product: p, score: scoreProduct(fragment, p) }))
    .filter((x) => x.score >= 60)
    .sort((a, b) => b.score - a.score);
  return scored;
}

function stripKeywords(text, extra = []) {
  const stop = [
    ...DICTIONARY.sale,
    ...DICTIONARY.restock,
    ...DICTIONARY.expense,
    ...DICTIONARY.withdrawal,
    ...DICTIONARY.homeHints,
    'on', 'for', 'of', 'the', 'a', 'an', 'at', 'each', 'and', 'to', 'from',
    'units', 'unit', 'items', 'item', 'packs', 'pack',
    ...extra,
  ];
  let leftover = ` ${text} `;
  leftover = leftover.replace(/\d+(?:\.\d+)?/g, ' ');
  leftover = leftover.replace(/\s(?:at|@|each|for)\s+/g, ' ');
  for (const w of stop) {
    leftover = leftover.replace(new RegExp(`\\b${escapeReg(w)}\\b`, 'gi'), ' ');
  }
  return leftover.replace(/\s+/g, ' ').trim();
}

function clarifyProducts(matches, pending) {
  const top = matches.slice(0, 3);
  const names = top.map((m) => m.product.name);
  const question =
    names.length === 1
      ? `Did you mean ${names[0]}?`
      : `Did you mean ${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}?`;
  return {
    intent: 'clarify',
    action: 'clarify',
    pending,
    question,
    buttons: top.map((m) => ({ label: m.product.name, value: m.product.name })),
    reply: question,
  };
}

function unknown() {
  return {
    intent: 'unknown',
    action: 'unknown',
    reply: EXAMPLE_HINT,
    buttons: [
      { label: 'Sold', value: 'sold ' },
      { label: 'Spent', value: 'spent ' },
      { label: 'Bought stock', value: 'bought ' },
      { label: 'Profit today', value: 'profit today' },
    ],
  };
}

function isQuery(text) {
  if (/^(what\s+is\s+)?low\b/.test(text) || text.includes('running out') || text === 'low stock') return { kind: 'low' };
  if (/\bbest\b/.test(text) || text.includes('top seller') || text.includes('best seller')) return { kind: 'best' };
  if (/\bstock\b/.test(text) && !hasAny(text, DICTIONARY.sale) && !hasAny(text, DICTIONARY.restock)) return { kind: 'stock' };
  if (/\bprofit\b/.test(text) || hasAny(text, DICTIONARY.query.profit)) return { kind: 'profit', period: detectPeriod(text) };
  if (text.includes('how much') || text.includes('sold today') || text.includes('sales today') || text.includes('sell today')) {
    return { kind: 'sales', period: detectPeriod(text) };
  }
  return null;
}

/**
 * Parse a free-text owner message into a structured action.
 * products: [{id, name, aliases, selling_price, cost_price, stock_qty}]
 */
export function parseMessage(raw, products = [], options = {}) {
  const text = norm(raw);
  if (!text) return unknown();

  if (hasAny(text, DICTIONARY.undo) || text === 'undo') {
    return { intent: 'undo', action: 'undo', reply: 'Undoing the last record.' };
  }

  if (options.pending && options.pending.intent) {
    return resolveClarification(text, products, options.pending);
  }

  const queryIntent = isQuery(text);
  if (queryIntent) {
    return {
      intent: 'query',
      action: 'query',
      query: queryIntent.kind,
      period: queryIntent.period || 'today',
    };
  }

  if (hasAny(text, DICTIONARY.withdrawal) || (hasAny(text, DICTIONARY.homeHints) && extractNumbers(text).length)) {
    return parseWithdrawal(text);
  }

  if (hasAny(text, DICTIONARY.restock)) {
    return parseRestock(text, products);
  }

  if (hasAny(text, DICTIONARY.expense) || isBareExpense(text)) {
    return parseExpense(text);
  }

  if (hasAny(text, DICTIONARY.sale) || looksLikeSale(text, products)) {
    return parseSale(text, products);
  }

  return unknown();
}

function isBareExpense(text) {
  const cats = Object.values(DICTIONARY.expenseCategories).flat();
  return (
    hasAny(text, cats) &&
    extractNumbers(text).length >= 1 &&
    !hasAny(text, DICTIONARY.sale) &&
    !hasAny(text, DICTIONARY.restock)
  );
}

function looksLikeSale(text, products) {
  const nums = extractNumbers(text);
  if (!nums.length) return false;
  const leftover = stripKeywords(text);
  if (!leftover) return false;
  if (!products.length) return /sold|sell|ndatengesa/.test(text);
  return matchProducts(leftover, products).length > 0 && !hasAny(text, DICTIONARY.expense);
}

function parseWithdrawal(text) {
  const nums = extractNumbers(text);
  if (!nums.length) {
    return {
      intent: 'clarify',
      action: 'clarify',
      pending: { intent: 'withdrawal' },
      question: 'How much did you take home?',
      buttons: [
        { label: '$5', value: 'withdrew 5' },
        { label: '$10', value: 'withdrew 10' },
        { label: '$20', value: 'withdrew 20' },
      ],
      reply: 'How much did you take home?',
    };
  }
  return {
    intent: 'withdrawal',
    action: 'withdrawal',
    amount: money(nums[0]),
    note: 'Taken for home',
  };
}

function parseExpense(text) {
  const nums = extractNumbers(text);
  const category = detectCategory(text);
  if (!nums.length) {
    return {
      intent: 'clarify',
      action: 'clarify',
      pending: { intent: 'expense', category },
      question: 'How much did you spend?',
      buttons: [
        { label: '$2', value: `spent 2 on ${category}` },
        { label: '$5', value: `spent 5 on ${category}` },
        { label: '$10', value: `spent 10 on ${category}` },
      ],
      reply: 'How much did you spend?',
    };
  }
  return {
    intent: 'expense',
    action: 'expense',
    amount: money(nums[0]),
    category,
    description: category.replace('_', ' / '),
  };
}

function parseQtyAndProduct(text, products) {
  const price = extractPrice(text);
  let working = text.replace(/(?:at|@|each|for)\s+\d+(?:\.\d+)?/gi, ' ');
  if (price != null) {
    working = working.replace(new RegExp(`${String(price).replace('.', '\\.')}`), ' ');
  }
  const nums = extractNumbers(working);
  const leftover = stripKeywords(working);
  const matches = leftover ? matchProducts(leftover, products) : [];
  const quantity = nums.length ? nums[0] : null;
  return { quantity, leftover, matches, price };
}

function parseSale(text, products) {
  const { quantity, leftover, matches, price } = parseQtyAndProduct(text, products);
  if (!leftover || !matches.length) {
    if (!leftover) {
      return { ...unknown(), reply: 'Which product did you sell? Try: sold 3 bread' };
    }
    return { ...unknown(), reply: `I do not know a product called "${leftover}". Add it in Stock first.` };
  }
  if (quantity == null) {
    return {
      intent: 'clarify',
      action: 'clarify',
      pending: { intent: 'sale', productId: matches[0].product.id, unitPrice: price },
      question: `How many ${matches[0].product.name} did you sell?`,
      buttons: [
        { label: '1', value: `sold 1 ${matches[0].product.name}` },
        { label: '2', value: `sold 2 ${matches[0].product.name}` },
        { label: '3', value: `sold 3 ${matches[0].product.name}` },
      ],
      reply: `How many ${matches[0].product.name} did you sell?`,
    };
  }
  const close = matches.filter((m) => m.score >= 70 && matches[0].score - m.score <= 8);
  if (close.length > 1 && matches[0].score < 95) {
    return clarifyProducts(close, { intent: 'sale', quantity, unitPrice: price });
  }
  return {
    intent: 'sale',
    action: 'sale',
    productId: matches[0].product.id,
    productName: matches[0].product.name,
    quantity: money(quantity),
    unitPrice: price,
  };
}

function parseRestock(text, products) {
  const { quantity, leftover, matches, price } = parseQtyAndProduct(text, products);
  if (!leftover || !matches.length) {
    return { ...unknown(), reply: leftover ? `I do not know "${leftover}". Add it in Stock first.` : 'Which product did you buy? Try: bought 10 bread at 0.80' };
  }
  if (quantity == null) {
    return {
      intent: 'clarify',
      action: 'clarify',
      pending: { intent: 'restock', productId: matches[0].product.id, unitCost: price },
      question: `How many ${matches[0].product.name} did you buy?`,
      buttons: [
        { label: '5', value: `bought 5 ${matches[0].product.name}` },
        { label: '10', value: `bought 10 ${matches[0].product.name}` },
        { label: '20', value: `bought 20 ${matches[0].product.name}` },
      ],
      reply: `How many ${matches[0].product.name} did you buy?`,
    };
  }
  const close = matches.filter((m) => m.score >= 70 && matches[0].score - m.score <= 8);
  if (close.length > 1 && matches[0].score < 95) {
    return clarifyProducts(close, { intent: 'restock', quantity, unitCost: price });
  }
  return {
    intent: 'restock',
    action: 'restock',
    productId: matches[0].product.id,
    productName: matches[0].product.name,
    quantity: money(quantity),
    unitCost: price,
  };
}

function resolveClarification(text, products, pending) {
  if (pending.intent === 'sale' || pending.intent === 'restock') {
    const matches = matchProducts(text, products);
    if (matches.length && !pending.productId) {
      return {
        intent: pending.intent,
        action: pending.intent,
        productId: matches[0].product.id,
        productName: matches[0].product.name,
        quantity: pending.quantity,
        unitPrice: pending.unitPrice,
        unitCost: pending.unitCost,
      };
    }
  }
  return parseMessage(text, products, {});
}

export function friendlyConfirm(action, extras = {}) {
  if (action.intent === 'sale') {
    const total = extras.total != null ? extras.total : money((action.quantity || 0) * (extras.unitPrice || action.unitPrice || 0));
    const left = extras.stockLeft != null ? ` ${extras.stockLeft} left.` : '';
    return `Saved: sold ${action.quantity} ${action.productName || extras.productName} = $${Number(total).toFixed(2)}.${left}`;
  }
  if (action.intent === 'expense') {
    return `Saved: spent $${Number(action.amount).toFixed(2)} on ${String(action.category).replace('_', '/')}.`;
  }
  if (action.intent === 'restock') {
    const left = extras.stockLeft != null ? ` Now ${extras.stockLeft} in stock.` : '';
    return `Saved: bought ${action.quantity} ${action.productName || extras.productName}.${left}`;
  }
  if (action.intent === 'withdrawal') {
    return `Saved: you took $${Number(action.amount).toFixed(2)} for home. This is not an expense.`;
  }
  if (action.intent === 'undo') {
    return extras.message || 'Undone.';
  }
  return extras.message || 'Saved.';
}
