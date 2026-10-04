import { z } from 'zod';
import { isValidZwPhone, normalisePhone } from '../utils/phone.js';

const phoneField = z
  .string()
  .min(9, 'Enter your phone number.')
  .transform(normalisePhone)
  .refine(isValidZwPhone, 'Use a Zimbabwe number like 0771234567.');

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name.').max(120),
  phone: phoneField,
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const loginSchema = z.object({
  phone: phoneField,
  password: z.string().min(1, 'Enter your password.'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
});
