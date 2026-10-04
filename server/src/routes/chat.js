import { Router } from 'express';
import { requireAuth, requireBusiness } from '../middleware/auth.js';
import { postChat, history } from '../controllers/chatController.js';

const router = Router();
router.use(requireAuth, requireBusiness);
router.post('/', postChat);
router.get('/history', history);

export default router;
