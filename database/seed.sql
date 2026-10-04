-- SHA demo seed (static rows).
-- Password for 0771234567 is Demo@1234.
-- The Node seed script (npm run seed) hashes the password and then
-- generates 30 days of sales, expenses, restocks and withdrawals.
-- You can also run this file in MySQL Workbench AFTER schema.sql
-- if you replace the password_hash placeholder with a bcrypt hash.

USE sha_db;

SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM chat_messages;
DELETE FROM owner_withdrawals;
DELETE FROM stock_purchases;
DELETE FROM expenses;
DELETE FROM sales;
DELETE FROM products;
DELETE FROM businesses;
DELETE FROM users;
SET FOREIGN_KEY_CHECKS = 1;
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE businesses AUTO_INCREMENT = 1;
ALTER TABLE products AUTO_INCREMENT = 1;
ALTER TABLE sales AUTO_INCREMENT = 1;
ALTER TABLE expenses AUTO_INCREMENT = 1;
ALTER TABLE stock_purchases AUTO_INCREMENT = 1;
ALTER TABLE owner_withdrawals AUTO_INCREMENT = 1;
ALTER TABLE chat_messages AUTO_INCREMENT = 1;

-- password_hash is filled by npm run seed (bcrypt of Demo@1234)
INSERT INTO users (id, full_name, phone, password_hash, plan, created_at)
VALUES (
  1,
  'Mai Tendai',
  '0771234567',
  '$2b$10$REPLACE_ME_IN_NODE_SEED.............................',
  'standard',
  DATE_SUB(NOW(), INTERVAL 40 DAY)
);

INSERT INTO businesses (id, user_id, name, type, location, currency, created_at)
VALUES (
  1,
  1,
  'Mai Tendai''s Tuckshop',
  'tuckshop',
  'Glen View, Harare',
  'USD',
  DATE_SUB(NOW(), INTERVAL 40 DAY)
);

INSERT INTO products
  (id, business_id, name, aliases, unit, cost_price, selling_price, stock_qty, reorder_level, is_active, created_at)
VALUES
  (1, 1, 'Bread', 'loaf,loaves,zinga', 'loaf', 0.80, 1.00, 25.00, 10.00, 1, DATE_SUB(NOW(), INTERVAL 40 DAY)),
  (2, 1, 'Cooking Oil 2L', 'oil,cooking oil,mafuta', 'bottle', 3.20, 3.80, 8.00, 4.00, 1, DATE_SUB(NOW(), INTERVAL 40 DAY)),
  (3, 1, 'Sugar 2kg', 'sugar,shuga', 'pack', 2.40, 2.90, 15.00, 5.00, 1, DATE_SUB(NOW(), INTERVAL 40 DAY)),
  (4, 1, 'Maputi', 'popcorn,puffed maize', 'pack', 0.30, 0.50, 40.00, 15.00, 1, DATE_SUB(NOW(), INTERVAL 40 DAY)),
  (5, 1, 'Eggs (tray)', 'eggs,egg,mazai', 'tray', 3.50, 4.20, 6.00, 3.00, 1, DATE_SUB(NOW(), INTERVAL 40 DAY)),
  (6, 1, 'Airtime $1', 'airtime,air time,bundle', 'card', 0.90, 1.00, 60.00, 20.00, 1, DATE_SUB(NOW(), INTERVAL 40 DAY)),
  (7, 1, 'Mazoe Orange', 'mazoe,orange,juice', 'bottle', 1.80, 2.20, 12.00, 6.00, 1, DATE_SUB(NOW(), INTERVAL 40 DAY)),
  (8, 1, 'Rice 2kg', 'rice,mupunga', 'pack', 2.50, 3.00, 10.00, 4.00, 1, DATE_SUB(NOW(), INTERVAL 40 DAY));
