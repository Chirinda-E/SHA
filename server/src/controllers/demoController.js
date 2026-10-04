import { seed } from '../db/seed.js';
import { asyncHandler } from '../middleware/error.js';
import { forbidden } from '../utils/httpError.js';
import { query } from '../db/pool.js';
import { publicUser } from '../services/authService.js';

const DEMO_PHONE = '0771234567';

export const resetDemo = asyncHandler(async (req, res) => {
  if (req.user.phone !== DEMO_PHONE) {
    throw forbidden('Reset demo data is only for the demo account (0771234567).');
  }
  await seed();
  const users = await query(
    'SELECT id, full_name, phone, plan, created_at FROM users WHERE phone = ?',
    [DEMO_PHONE],
  );
  const businesses = await query(
    'SELECT id, user_id, name, type, location, currency, created_at FROM businesses WHERE user_id = ? LIMIT 1',
    [users[0].id],
  );
  res.json({
    ok: true,
    message: 'Demo data has been reset.',
    user: publicUser(users[0], businesses[0] || null),
  });
});
