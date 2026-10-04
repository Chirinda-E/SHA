import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { conflict, unauthorized, badRequest } from '../utils/httpError.js';
import { signToken } from '../middleware/auth.js';

export function publicUser(user, business) {
  return {
    id: user.id,
    fullName: user.full_name,
    phone: user.phone,
    plan: user.plan,
    createdAt: user.created_at,
    business: business
      ? {
          id: business.id,
          name: business.name,
          type: business.type,
          location: business.location,
          currency: business.currency,
          createdAt: business.created_at,
        }
      : null,
  };
}

export async function registerUser({ fullName, phone, password }) {
  const existing = await query('SELECT id FROM users WHERE phone = ?', [phone]);
  if (existing.length) {
    throw conflict('That phone number already has an account. Try logging in.');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    'INSERT INTO users (full_name, phone, password_hash) VALUES (?, ?, ?)',
    [fullName, phone, passwordHash],
  );
  const users = await query(
    'SELECT id, full_name, phone, plan, created_at FROM users WHERE id = ?',
    [result.insertId],
  );
  const token = signToken({ sub: users[0].id });
  return { user: publicUser(users[0], null), token };
}

export async function loginUser({ phone, password }) {
  const users = await query(
    'SELECT id, full_name, phone, password_hash, plan, created_at FROM users WHERE phone = ?',
    [phone],
  );
  if (!users.length) throw unauthorized('Phone or password is wrong.');
  const ok = await bcrypt.compare(password, users[0].password_hash);
  if (!ok) throw unauthorized('Phone or password is wrong.');

  const businesses = await query(
    'SELECT id, user_id, name, type, location, currency, created_at FROM businesses WHERE user_id = ? LIMIT 1',
    [users[0].id],
  );
  const token = signToken({ sub: users[0].id });
  return { user: publicUser(users[0], businesses[0] || null), token };
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const users = await query('SELECT password_hash FROM users WHERE id = ?', [userId]);
  if (!users.length) throw unauthorized();
  const ok = await bcrypt.compare(currentPassword, users[0].password_hash);
  if (!ok) throw badRequest('Current password is wrong.');
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
}

export async function upgradePlan(userId) {
  await query("UPDATE users SET plan = 'standard' WHERE id = ?", [userId]);
  const users = await query(
    'SELECT id, full_name, phone, plan, created_at FROM users WHERE id = ?',
    [userId],
  );
  const businesses = await query(
    'SELECT id, user_id, name, type, location, currency, created_at FROM businesses WHERE user_id = ? LIMIT 1',
    [userId],
  );
  return publicUser(users[0], businesses[0] || null);
}
