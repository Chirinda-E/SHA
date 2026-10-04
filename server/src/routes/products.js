import { Router } from 'express';
import { requireAuth, requireBusiness } from '../middleware/auth.js';
import { list, create, createBulk, update, remove, samples } from '../controllers/productController.js';

const router = Router();
router.use(requireAuth, requireBusiness);
router.get('/', list);
router.get('/samples', samples);
router.post('/', create);
router.post('/bulk', createBulk);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
