import { businessSchema } from '../validators/business.js';
import { createBusiness, getBusinessForUser, updateBusiness, sampleProductsFor } from '../services/businessService.js';
import { asyncHandler } from '../middleware/error.js';

export const create = asyncHandler(async (req, res) => {
  const body = businessSchema.parse(req.body);
  const business = await createBusiness(req.user.id, body);
  req.business = business;
  res.status(201).json({
    business,
    sampleProducts: sampleProductsFor(business.type),
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const business = await getBusinessForUser(req.user.id);
  res.json({ business, sampleProducts: sampleProductsFor(business.type) });
});

export const update = asyncHandler(async (req, res) => {
  const body = businessSchema.parse(req.body);
  const business = await updateBusiness(req.user.id, body);
  res.json({ business });
});
