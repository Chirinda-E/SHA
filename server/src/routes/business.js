import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { create, getOne, update } from '../controllers/businessController.js';

const router = Router();
router.use(requireAuth);
router.post('/', create);
router.get('/', getOne);
router.put('/', update);

export default router;
