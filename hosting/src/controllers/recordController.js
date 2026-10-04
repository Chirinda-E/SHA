import {
  saleSchema,
  expenseSchema,
  purchaseSchema,
  withdrawalSchema,
} from '../validators/records.js';
import {
  listSales,
  listExpenses,
  listPurchases,
  listWithdrawals,
  recordSale,
  recordExpense,
  recordPurchase,
  recordWithdrawal,
  deleteSale,
  deleteExpense,
  deletePurchase,
  deleteWithdrawal,
} from '../services/recordService.js';
import { asyncHandler } from '../middleware/error.js';

export const getSales = asyncHandler(async (req, res) => {
  const sales = await listSales(req.business.id, req.query.period);
  res.json({ sales });
});

export const getExpenses = asyncHandler(async (req, res) => {
  const expenses = await listExpenses(req.business.id, req.query.period);
  res.json({ expenses });
});

export const getPurchases = asyncHandler(async (req, res) => {
  const purchases = await listPurchases(req.business.id, req.query.period);
  res.json({ purchases });
});

export const getWithdrawals = asyncHandler(async (req, res) => {
  const withdrawals = await listWithdrawals(req.business.id, req.query.period);
  res.json({ withdrawals });
});

export const postSale = asyncHandler(async (req, res) => {
  const body = saleSchema.parse(req.body);
  const record = await recordSale(req.business.id, body);
  res.status(201).json({ record });
});

export const postExpense = asyncHandler(async (req, res) => {
  const body = expenseSchema.parse(req.body);
  const record = await recordExpense(req.business.id, body);
  res.status(201).json({ record });
});

export const postPurchase = asyncHandler(async (req, res) => {
  const body = purchaseSchema.parse(req.body);
  const record = await recordPurchase(req.business.id, body);
  res.status(201).json({ record });
});

export const postWithdrawal = asyncHandler(async (req, res) => {
  const body = withdrawalSchema.parse(req.body);
  const record = await recordWithdrawal(req.business.id, body);
  res.status(201).json({ record });
});

export const removeSale = asyncHandler(async (req, res) => {
  const result = await deleteSale(req.business.id, Number(req.params.id));
  res.json(result);
});

export const removeExpense = asyncHandler(async (req, res) => {
  const result = await deleteExpense(req.business.id, Number(req.params.id));
  res.json(result);
});

export const removePurchase = asyncHandler(async (req, res) => {
  const result = await deletePurchase(req.business.id, Number(req.params.id));
  res.json(result);
});

export const removeWithdrawal = asyncHandler(async (req, res) => {
  const result = await deleteWithdrawal(req.business.id, Number(req.params.id));
  res.json(result);
});
