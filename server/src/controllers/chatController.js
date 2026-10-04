import { chatSchema } from '../validators/records.js';
import { handleChat, getHistory } from '../services/chatService.js';
import { asyncHandler } from '../middleware/error.js';

export const postChat = asyncHandler(async (req, res) => {
  const body = chatSchema.parse(req.body);
  const result = await handleChat(req.business.id, body.message, { confirm: body.confirm });
  res.json(result);
});

export const history = asyncHandler(async (req, res) => {
  const messages = await getHistory(req.business.id, Number(req.query.limit) || 80);
  res.json({ messages });
});
