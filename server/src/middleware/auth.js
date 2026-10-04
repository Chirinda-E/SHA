import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';
import { unauthorized } from '../utils/httpError.js';

export function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function setAuthCookie(res, token) {
  const sameSite = env.cookieSameSite === 'none' ? 'none' : 'lax';
  res.cookie('sha_token', token, {
    httpOnly: true,
    sameSite,
    secure: env.nodeEnv === 'production' || sameSite === 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie('sha_token', { path: '/' });
}

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = bearer || req.cookies?.sha_token;
    if (!token) throw unauthorized();

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch {
      throw unauthorized('Session expired. Please log in again.');
    }

    const users = await query(
      'SELECT id, full_name, phone, plan, created_at FROM users WHERE id = ?',
      [decoded.sub],
    );
    if (!users.length) throw unauthorized();

    const businesses = await query(
      'SELECT id, user_id, name, type, location, currency, created_at FROM businesses WHERE user_id = ? LIMIT 1',
      [users[0].id],
    );

    req.user = users[0];
    req.business = businesses[0] || null;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireBusiness(req, _res, next) {
  if (!req.business) {
    return next(unauthorized('Please finish setting up your business first.'));
  }
  next();
}
