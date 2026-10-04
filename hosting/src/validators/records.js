import { z } from 'zod';

export const expenseCategories = [
  'transport',
  'rent',
  'airtime_data',
  'electricity',
  'wages',
  'supplies',
  'other',
];

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Enter a product name.').max(120),
  aliases: z.string().trim().max(255).optional().default(''),
  unit: z.string().trim().max(40).optional().default('item'),
  costPrice: z.coerce.number().min(0, 'Cost cannot be negative.'),
  sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative.'),
  stockQty: z.coerce.number().min(0, 'Stock cannot be negative.'),
  reorderLevel: z.coerce.number().min(0).optional().default(0),
});

export const saleSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().positive('Enter how many you sold.'),
  unitPrice: z.coerce.number().min(0).optional(),
  soldAt: z.string().optional(),
  confirmNegative: z.boolean().optional().default(false),
  source: z.enum(['chat', 'form']).optional().default('form'),
});

export const expenseSchema = z.object({
  category: z.enum(expenseCategories, { errorMap: () => ({ message: 'Choose a category.' }) }),
  description: z.string().trim().max(255).optional().default(''),
  amount: z.coerce.number().positive('Enter the amount spent.'),
  spentAt: z.string().optional(),
  source: z.enum(['chat', 'form']).optional().default('form'),
});

export const purchaseSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().positive('Enter how many you bought.'),
  unitCost: z.coerce.number().min(0, 'Enter the cost of each item.'),
  purchasedAt: z.string().optional(),
  source: z.enum(['chat', 'form']).optional().default('form'),
});

export const withdrawalSchema = z.object({
  amount: z.coerce.number().positive('Enter how much you took.'),
  note: z.string().trim().max(255).optional().default(''),
  takenAt: z.string().optional(),
});

export const chatSchema = z.object({
  message: z.string().trim().min(1, 'Type a message.').max(500),
  confirm: z.boolean().optional().default(false),
});
