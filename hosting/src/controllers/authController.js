import { registerSchema, loginSchema, changePasswordSchema } from '../validators/auth.js';
import { registerUser, loginUser, changePassword, publicUser, upgradePlan } from '../services/authService.js';
import { setAuthCookie, clearAuthCookie } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

export const register = asyncHandler(async (req, res) => {
  const body = registerSchema.parse(req.body);
  const { user, token } = await registerUser(body);
  setAuthCookie(res, token);
  res.status(201).json({ user, token });
});

export const login = asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const { user, token } = await loginUser(body);
  setAuthCookie(res, token);
  res.json({ user, token });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user, req.business) });
});

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

export const changePasswordHandler = asyncHandler(async (req, res) => {
  const body = changePasswordSchema.parse(req.body);
  await changePassword(req.user.id, body);
  res.json({ ok: true, message: 'Password changed.' });
});

export const upgrade = asyncHandler(async (req, res) => {
  const user = await upgradePlan(req.user.id);
  res.json({ user, message: 'You are now on the Standard plan.' });
});
