import {
  getSummary,
  getTopProducts,
  getLowStock,
  getInsights,
  getLenderSummary,
  getChartSeries,
} from '../services/reportService.js';
import { asyncHandler } from '../middleware/error.js';

function periodOf(req) {
  const p = String(req.query.period || 'today');
  return ['today', 'week', 'month'].includes(p) ? p : 'today';
}

export const summary = asyncHandler(async (req, res) => {
  const data = await getSummary(req.business.id, periodOf(req));
  res.json(data);
});

export const topProducts = asyncHandler(async (req, res) => {
  const data = await getTopProducts(req.business.id, periodOf(req));
  res.json(data);
});

export const lowStock = asyncHandler(async (req, res) => {
  const items = await getLowStock(req.business.id);
  const alerts = items.filter((i) => i.flag).sort((a, b) => a.daysLeft - b.daysLeft || a.stockQty - b.stockQty);
  res.json({ items, alerts });
});

export const insights = asyncHandler(async (req, res) => {
  const items = await getInsights(req.business.id);
  res.json({ insights: items });
});

export const lenderSummary = asyncHandler(async (req, res) => {
  const data = await getLenderSummary(req.business.id, req.business);
  res.json(data);
});

export const charts = asyncHandler(async (req, res) => {
  const data = await getChartSeries(req.business.id, periodOf(req));
  res.json(data);
});
