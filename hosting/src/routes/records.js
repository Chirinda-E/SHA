import { Router } from 'express';
import { requireAuth, requireBusiness } from '../middleware/auth.js';
import {
  getSales,
  getExpenses,
  getPurchases,
  getWithdrawals,
  postSale,
  postExpense,
  postPurchase,
  postWithdrawal,
  removeSale,
  removeExpense,
  removePurchase,
  removeWithdrawal,
} from '../controllers/recordController.js';

const router = Router();
router.use(requireAuth, requireBusiness);

router.get('/sales', getSales);
router.post('/sales', postSale);
router.delete('/sales/:id', removeSale);

router.get('/expenses', getExpenses);
router.post('/expenses', postExpense);
router.delete('/expenses/:id', removeExpense);

router.get('/purchases', getPurchases);
router.post('/purchases', postPurchase);
router.delete('/purchases/:id', removePurchase);

router.get('/withdrawals', getWithdrawals);
router.post('/withdrawals', postWithdrawal);
router.delete('/withdrawals/:id', removeWithdrawal);

export default router;
