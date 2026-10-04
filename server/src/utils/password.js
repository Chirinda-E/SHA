import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');

export function hashPassword(plain) {
  return bcrypt.hash(String(plain), 10);
}

export function checkPassword(plain, hash) {
  return bcrypt.compare(String(plain), String(hash));
}
