import { productSchema } from '../validators/records.js';
import { z } from 'zod';
import {
  listProducts,
  createProduct,
  createManyProducts,
  updateProduct,
  deactivateProduct,
} from '../services/productService.js';
import { sampleProductsFor } from '../services/businessService.js';
import { asyncHandler } from '../middleware/error.js';

const bulkSchema = z.object({
  products: z.array(productSchema).min(1, 'Add at least one product.'),
});

export const list = asyncHandler(async (req, res) => {
  const products = await listProducts(req.business.id);
  res.json({ products });
});

export const create = asyncHandler(async (req, res) => {
  const body = productSchema.parse(req.body);
  const product = await createProduct(req.business.id, body);
  res.status(201).json({ product });
});

export const createBulk = asyncHandler(async (req, res) => {
  const body = bulkSchema.parse(req.body);
  const products = await createManyProducts(req.business.id, body.products);
  res.status(201).json({ products });
});

export const update = asyncHandler(async (req, res) => {
  const body = productSchema.parse(req.body);
  const product = await updateProduct(req.business.id, Number(req.params.id), body);
  res.json({ product });
});

export const remove = asyncHandler(async (req, res) => {
  await deactivateProduct(req.business.id, Number(req.params.id));
  res.json({ ok: true });
});

export const samples = asyncHandler(async (req, res) => {
  res.json({ products: sampleProductsFor(req.business.type) });
});
