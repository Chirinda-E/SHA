import { z } from 'zod';

export const businessTypes = ['tuckshop', 'salon', 'vendor', 'service', 'other'];

export const businessSchema = z.object({
  name: z.string().trim().min(2, 'Enter your business name.').max(160),
  type: z.enum(businessTypes, { errorMap: () => ({ message: 'Choose a business type.' }) }),
  location: z.string().trim().max(160).optional().default(''),
  currency: z.string().trim().max(8).optional().default('USD'),
});
