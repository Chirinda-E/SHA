import { Router } from 'express';
import { requireAuth, requireBusiness } from '../middleware/auth.js';
import {
  summary,
  topProducts,
  lowStock,
  insights,
  lenderSummary,
  charts,
} from '../controllers/reportController.js';

const router = Router();
router.use(requireAuth, requireBusiness);
router.get('/summary', summary);
router.get('/top-products', topProducts);
router.get('/low-stock', lowStock);
router.get('/insights', insights);
router.get('/lender-summary', lenderSummary);
router.get('/charts', charts);

export default router;
