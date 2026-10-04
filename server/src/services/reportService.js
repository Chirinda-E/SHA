import { query } from '../db/pool.js';
import { money, formatMoney } from '../utils/money.js';

const PERIOD_DAYS = { today: 0, week: 6, month: 29 };

export function periodBounds(period = 'today') {
  const days = PERIOD_DAYS[period] ?? 0;
  return { days, period };
}

function sinceSql(days) {
  if (days === 0) return 'CURDATE()';
  return `CURDATE() - INTERVAL ${Number(days)} DAY`;
}

export async function getSummary(businessId, period = 'today') {
  const { days } = periodBounds(period);
  const since = sinceSql(days);

  const [sales] = await query(
    `SELECT
       COALESCE(SUM(total), 0) AS cash_received,
       COALESCE(SUM(quantity * (unit_price - unit_cost)), 0) AS gross_profit,
       COUNT(*) AS sale_count
     FROM sales
     WHERE business_id = ? AND sold_at >= ${since}`,
    [businessId],
  );
  const [expenses] = await query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE business_id = ? AND spent_at >= ${since}`,
    [businessId],
  );
  const [withdrawals] = await query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM owner_withdrawals
     WHERE business_id = ? AND taken_at >= ${since}`,
    [businessId],
  );
  const [purchases] = await query(
    `SELECT COALESCE(SUM(total_cost), 0) AS total
     FROM stock_purchases
     WHERE business_id = ? AND purchased_at >= ${since}`,
    [businessId],
  );

  const cashReceived = money(sales.cash_received);
  const grossProfit = money(sales.gross_profit);
  const expenseTotal = money(expenses.total);
  const netProfit = money(grossProfit - expenseTotal);
  const withdrawalTotal = money(withdrawals.total);
  const restockSpend = money(purchases.total);

  const explanation = buildCashVsProfitSentence({
    cashReceived,
    netProfit,
    expenseTotal,
    withdrawalTotal,
  });

  return {
    period,
    cashReceived,
    grossProfit,
    expenses: expenseTotal,
    netProfit,
    withdrawals: withdrawalTotal,
    restockSpend,
    saleCount: Number(sales.sale_count) || 0,
    explanation,
  };
}

function buildCashVsProfitSentence({ cashReceived, netProfit, expenseTotal, withdrawalTotal }) {
  const cash = formatMoney(cashReceived);
  const profit = formatMoney(netProfit);
  if (cashReceived === 0 && expenseTotal === 0) {
    return 'No sales yet in this period. Record a sale to see money received and profit.';
  }
  if (netProfit < 0) {
    return `You received ${cash} from customers, but after costs and ${formatMoney(expenseTotal)} in expenses you are ${formatMoney(Math.abs(netProfit))} down. Money taken home (${formatMoney(withdrawalTotal)}) is not an expense.`;
  }
  return `You received ${cash} from customers. After the cost of goods and ${formatMoney(expenseTotal)} in expenses, profit is ${profit}. The ${formatMoney(withdrawalTotal)} you took home is not profit — it is money leaving the till.`;
}

export async function getTopProducts(businessId, period = 'week') {
  const { days } = periodBounds(period);
  const since = sinceSql(days);
  const rows = await query(
    `SELECT
       p.id,
       p.name,
       COALESCE(SUM(s.quantity), 0) AS qty,
       COALESCE(SUM(s.total), 0) AS cash,
       COALESCE(SUM(s.quantity * (s.unit_price - s.unit_cost)), 0) AS profit
     FROM products p
     LEFT JOIN sales s
       ON s.product_id = p.id AND s.business_id = p.business_id AND s.sold_at >= ${since}
     WHERE p.business_id = ? AND p.is_active = 1
     GROUP BY p.id, p.name
     ORDER BY qty DESC, profit DESC`,
    [businessId],
  );

  const mapped = rows.map((r) => ({
    id: r.id,
    name: r.name,
    quantity: money(r.qty),
    cash: money(r.cash),
    profit: money(r.profit),
  }));

  const byQty = [...mapped].sort((a, b) => b.quantity - a.quantity);
  const byProfit = [...mapped].sort((a, b) => b.profit - a.profit);

  return {
    period,
    byQuantity: byQty,
    byProfit,
    bestByQty: byQty[0] || null,
    worstByQty: [...byQty].reverse()[0] || null,
    bestByProfit: byProfit[0] || null,
    worstByProfit: [...byProfit].reverse()[0] || null,
  };
}

export async function getLowStock(businessId) {
  const products = await query(
    'SELECT * FROM products WHERE business_id = ? AND is_active = 1 ORDER BY name',
    [businessId],
  );
  const sales = await query(
    `SELECT product_id, SUM(quantity) AS qty
     FROM sales
     WHERE business_id = ? AND sold_at >= CURDATE() - INTERVAL 13 DAY
     GROUP BY product_id`,
    [businessId],
  );
  const soldMap = Object.fromEntries(sales.map((s) => [s.product_id, Number(s.qty)]));

  return products.map((p) => {
    const sold14 = soldMap[p.id] || 0;
    const avgDaily = money(sold14 / 14);
    const stock = money(p.stock_qty);
    const daysLeft = avgDaily > 0 ? money(stock / avgDaily) : stock > 0 ? 99 : 0;
    const flag = daysLeft <= 3 || stock <= money(p.reorder_level);
    const coverWeek = Math.ceil(Math.max(avgDaily * 7, money(p.reorder_level)));
    const suggested = Math.max(0, coverWeek - Math.floor(stock));
    return {
      id: p.id,
      name: p.name,
      unit: p.unit,
      stockQty: stock,
      reorderLevel: money(p.reorder_level),
      avgDaily,
      daysLeft,
      flag,
      status: stock <= 0 ? 'out' : daysLeft <= 3 || stock <= money(p.reorder_level) ? 'low' : stock <= money(p.reorder_level) * 1.5 ? 'watch' : 'ok',
      suggestedRestock: suggested,
    };
  });
}

export async function getChartSeries(businessId, period = 'week') {
  const { days } = periodBounds(period);
  const since = sinceSql(days);
  const sales = await query(
    `SELECT DATE(sold_at) AS d, SUM(total) AS cash, SUM(quantity * (unit_price - unit_cost)) AS profit
     FROM sales WHERE business_id = ? AND sold_at >= ${since}
     GROUP BY DATE(sold_at) ORDER BY d`,
    [businessId],
  );
  const expenses = await query(
    `SELECT DATE(spent_at) AS d, SUM(amount) AS amount
     FROM expenses WHERE business_id = ? AND spent_at >= ${since}
     GROUP BY DATE(spent_at) ORDER BY d`,
    [businessId],
  );
  const expenseCats = await query(
    `SELECT category, SUM(amount) AS amount
     FROM expenses WHERE business_id = ? AND spent_at >= ${since}
     GROUP BY category ORDER BY amount DESC`,
    [businessId],
  );

  const map = new Map();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days);
  for (let i = 0; i <= days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    map.set(key, { date: key, cash: 0, expenses: 0, profit: 0 });
  }
  for (const row of sales) {
    const key = toDateKey(row.d);
    if (!map.has(key)) map.set(key, { date: key, cash: 0, expenses: 0, profit: 0 });
    map.get(key).cash = money(row.cash);
    map.get(key).profit = money(row.profit);
  }
  for (const row of expenses) {
    const key = toDateKey(row.d);
    if (!map.has(key)) map.set(key, { date: key, cash: 0, expenses: 0, profit: 0 });
    map.get(key).expenses = money(row.amount);
    map.get(key).profit = money(map.get(key).profit - map.get(key).expenses);
  }

  return {
    period,
    series: [...map.values()].sort((a, b) => a.date.localeCompare(b.date)),
    expensesByCategory: expenseCats.map((r) => ({ category: r.category, amount: money(r.amount) })),
  };
}

function toDateKey(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export async function getInsights(businessId) {
  const week = await getSummary(businessId, 'week');
  const lastWeekSales = await query(
    `SELECT COALESCE(SUM(quantity * (unit_price - unit_cost)), 0) AS gross
     FROM sales
     WHERE business_id = ?
       AND sold_at >= CURDATE() - INTERVAL 13 DAY
       AND sold_at < CURDATE() - INTERVAL 6 DAY`,
    [businessId],
  );
  const transport = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN spent_at >= CURDATE() - INTERVAL 6 DAY THEN amount END), 0) AS this_week,
       COALESCE(SUM(CASE WHEN spent_at >= CURDATE() - INTERVAL 13 DAY AND spent_at < CURDATE() - INTERVAL 6 DAY THEN amount END), 0) AS last_week
     FROM expenses
     WHERE business_id = ? AND category = 'transport'`,
    [businessId],
  );
  const tops = await getTopProducts(businessId, 'week');
  const low = await getLowStock(businessId);
  const tips = [];

  const best = tops.bestByProfit;
  if (best && best.profit > 0) {
    tips.push(`${best.name} earned you the most profit this week: ${formatMoney(best.profit)}.`);
  }

  const flagged = low.filter((p) => p.flag).sort((a, b) => {
    const urg = (x) => (x.stockQty <= 0 ? 0 : x.daysLeft <= 3 ? 1 : x.stockQty / Math.max(x.reorderLevel, 1));
    return urg(a) - urg(b);
  });
  if (flagged[0]) {
    const p = flagged[0];
    if (p.stockQty <= 0) {
      tips.push(`${p.name} is finished. Buy about ${Math.max(p.suggestedRestock, 7)} more today.`);
    } else if (p.daysLeft <= 3) {
      const dayWord = p.daysLeft <= 1 ? '1 day' : `${Math.max(1, Math.round(p.daysLeft))} days`;
      tips.push(`${p.name} will run out in about ${dayWord}. Buy ${p.suggestedRestock || 'a few'} more soon.`);
    } else {
      tips.push(`${p.name} is getting low: ${p.stockQty} left. Buy ${p.suggestedRestock || 'more'} before you run out.`);
    }
  }

  const thisT = money(transport[0]?.this_week);
  const lastT = money(transport[0]?.last_week);
  if (lastT > 0) {
    const change = ((thisT - lastT) / lastT) * 100;
    if (Math.abs(change) >= 8) {
      const dir = change > 0 ? 'more' : 'less';
      tips.push(`You spent ${Math.abs(Math.round(change))}% ${dir} on transport than last week.`);
    }
  }

  const slow = [...tops.byQuantity].filter((p) => p.quantity <= 2);
  const slowWithStock = slow
    .map((p) => ({ ...p, stock: low.find((l) => l.id === p.id)?.stockQty || 0 }))
    .filter((p) => p.stock >= 8)
    .sort((a, b) => b.stock - a.stock)[0];
  if (slowWithStock) {
    tips.push(`${slowWithStock.name} sells slowly and has ${slowWithStock.stock} units on the shelf.`);
  }

  if (week.cashReceived > 0) {
    tips.push(
      `This week you received ${formatMoney(week.cashReceived)} but profit is ${formatMoney(week.netProfit)}. Money taken home was ${formatMoney(week.withdrawals)}.`,
    );
  }

  const lastGross = money(lastWeekSales[0]?.gross);
  if (lastGross > 0 && week.grossProfit > 0) {
    const change = ((week.grossProfit - lastGross) / lastGross) * 100;
    if (Math.abs(change) >= 10) {
      tips.push(
        change > 0
          ? `Profit from sales is up ${Math.round(change)}% from last week. Keep doing what is working.`
          : `Profit from sales is down ${Math.abs(Math.round(change))}% from last week. Check prices and slow items.`,
      );
    }
  }

  const unique = [];
  for (const tip of tips) {
    if (!unique.includes(tip)) unique.push(tip);
  }
  if (!unique.length) {
    unique.push('Record a few sales and SHA will start giving you tips.');
    unique.push('Add cost price on each product so profit is true.');
    unique.push('Set a reorder level so you get a warning before stock runs out.');
  }
  return unique.slice(0, 5);
}

export async function getLenderSummary(businessId, business) {
  const summary = await getSummary(businessId, 'month');
  const tops = await getTopProducts(businessId, 'month');
  const daysWithSales = await query(
    `SELECT COUNT(DISTINCT DATE(sold_at)) AS days
     FROM sales WHERE business_id = ? AND sold_at >= CURDATE() - INTERVAL 29 DAY`,
    [businessId],
  );
  const activeDays = Math.max(1, Number(daysWithSales[0]?.days) || 1);
  return {
    title: 'Business Performance Summary',
    generatedAt: new Date().toISOString(),
    periodLabel: 'Last 30 days',
    business: {
      name: business.name,
      type: business.type,
      location: business.location,
      currency: business.currency || 'USD',
    },
    sales: summary.cashReceived,
    expenses: summary.expenses,
    netProfit: summary.netProfit,
    withdrawals: summary.withdrawals,
    restockSpend: summary.restockSpend,
    averageDailySales: money(summary.cashReceived / 30),
    averageDailySalesOnOpenDays: money(summary.cashReceived / activeDays),
    bestProducts: tops.byProfit.filter((p) => p.profit > 0).slice(0, 5),
    note: 'Restocking is stock bought, not an expense. Owner withdrawals are money taken home, not an expense.',
  };
}
