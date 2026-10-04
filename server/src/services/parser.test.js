import { describe, expect, it } from 'vitest';
import { parseMessage, levenshtein, matchProducts } from './parser.js';

const products = [
  { id: 1, name: 'Bread', aliases: 'loaf,loaves,zinga' },
  { id: 2, name: 'Cooking Oil 2L', aliases: 'oil,cooking oil,mafuta' },
  { id: 3, name: 'Sugar 2kg', aliases: 'sugar,shuga' },
  { id: 4, name: 'Maputi', aliases: 'popcorn' },
  { id: 5, name: 'Eggs (tray)', aliases: 'eggs,egg,mazai' },
  { id: 6, name: 'Airtime $1', aliases: 'airtime,air time' },
  { id: 7, name: 'Mazoe Orange', aliases: 'mazoe,orange,juice' },
  { id: 8, name: 'Rice 2kg', aliases: 'rice,mupunga' },
  { id: 9, name: 'Brown Bread', aliases: 'brown loaf' },
];

describe('levenshtein', () => {
  it('returns 0 for equal strings', () => {
    expect(levenshtein('bread', 'bread')).toBe(0);
  });
  it('tolerates a one-letter typo', () => {
    expect(levenshtein('bred', 'bread')).toBe(1);
  });
});

describe('fuzzy product matching', () => {
  it('matches aliases like oil -> Cooking Oil 2L', () => {
    const hits = matchProducts('oil', products);
    expect(hits[0].product.id).toBe(2);
  });
  it('matches typo bred -> Bread', () => {
    const hits = matchProducts('bred', products);
    expect(hits[0].product.name).toMatch(/Bread/);
  });
});

describe('parseMessage sales', () => {
  it('sold 3 bread', () => {
    const r = parseMessage('sold 3 bread', products);
    expect(r.intent).toBe('sale');
    expect(r.quantity).toBe(3);
    expect(r.productId).toBe(1);
  });
  it('sold bread 3', () => {
    const r = parseMessage('sold bread 3', products);
    expect(r.intent).toBe('sale');
    expect(r.quantity).toBe(3);
    expect(r.productId).toBe(1);
  });
  it('sold 2 oil at 3.50', () => {
    const r = parseMessage('sold 2 oil at 3.50', products);
    expect(r.intent).toBe('sale');
    expect(r.quantity).toBe(2);
    expect(r.productId).toBe(2);
    expect(r.unitPrice).toBe(3.5);
  });
  it('3 bread sold', () => {
    const r = parseMessage('3 bread sold', products);
    expect(r.intent).toBe('sale');
    expect(r.quantity).toBe(3);
    expect(r.productId).toBe(1);
  });
  it('SELL 1 MAPUTI', () => {
    const r = parseMessage('SELL 1 MAPUTI', products);
    expect(r.intent).toBe('sale');
    expect(r.productId).toBe(4);
  });
  it('sold 5 eggs', () => {
    const r = parseMessage('sold 5 eggs', products);
    expect(r.intent).toBe('sale');
    expect(r.productId).toBe(5);
  });
  it('ndatengesa 2 bread', () => {
    const r = parseMessage('ndatengesa 2 bread', products);
    expect(r.intent).toBe('sale');
    expect(r.quantity).toBe(2);
  });
  it('sold 4 airtime', () => {
    const r = parseMessage('sold 4 airtime', products);
    expect(r.intent).toBe('sale');
    expect(r.productId).toBe(6);
  });
  it('sold 1 mazoe', () => {
    const r = parseMessage('sold 1 mazoe', products);
    expect(r.intent).toBe('sale');
    expect(r.productId).toBe(7);
  });
  it('asks how many when qty missing', () => {
    const r = parseMessage('sold bread', products);
    expect(r.intent).toBe('clarify');
    expect(r.buttons?.length).toBeGreaterThan(0);
  });
});

describe('parseMessage expenses', () => {
  it('spent 5 on transport', () => {
    const r = parseMessage('spent 5 on transport', products);
    expect(r.intent).toBe('expense');
    expect(r.amount).toBe(5);
    expect(r.category).toBe('transport');
  });
  it('paid 20 rent', () => {
    const r = parseMessage('paid 20 rent', products);
    expect(r.intent).toBe('expense');
    expect(r.amount).toBe(20);
    expect(r.category).toBe('rent');
  });
  it('airtime 2', () => {
    const r = parseMessage('airtime 2', products);
    expect(r.intent).toBe('expense');
    expect(r.amount).toBe(2);
    expect(r.category).toBe('airtime_data');
  });
  it('ndashandisa 3 kombi', () => {
    const r = parseMessage('ndashandisa 3 kombi', products);
    expect(r.intent).toBe('expense');
    expect(r.category).toBe('transport');
  });
  it('paid 6 zesa', () => {
    const r = parseMessage('paid 6 zesa', products);
    expect(r.intent).toBe('expense');
    expect(r.category).toBe('electricity');
  });
});

describe('parseMessage restock', () => {
  it('bought 20 bread at 0.50', () => {
    const r = parseMessage('bought 20 bread at 0.50', products);
    expect(r.intent).toBe('restock');
    expect(r.quantity).toBe(20);
    expect(r.unitCost).toBe(0.5);
    expect(r.productId).toBe(1);
  });
  it('restocked 10 sugar 1.20 each', () => {
    const r = parseMessage('restocked 10 sugar 1.20 each', products);
    expect(r.intent).toBe('restock');
    expect(r.quantity).toBe(10);
    expect(r.unitCost).toBe(1.2);
    expect(r.productId).toBe(3);
  });
  it('ndatenga 8 rice', () => {
    const r = parseMessage('ndatenga 8 rice', products);
    expect(r.intent).toBe('restock');
    expect(r.productId).toBe(8);
    expect(r.quantity).toBe(8);
  });
});

describe('parseMessage withdrawals and undo', () => {
  it('took 10 for home', () => {
    const r = parseMessage('took 10 for home', products);
    expect(r.intent).toBe('withdrawal');
    expect(r.amount).toBe(10);
  });
  it('withdrew 5', () => {
    const r = parseMessage('withdrew 5', products);
    expect(r.intent).toBe('withdrawal');
    expect(r.amount).toBe(5);
  });
  it('undo', () => {
    expect(parseMessage('undo', products).intent).toBe('undo');
  });
});

describe('parseMessage questions', () => {
  it('profit today', () => {
    const r = parseMessage('profit today', products);
    expect(r.intent).toBe('query');
    expect(r.query).toBe('profit');
    expect(r.period).toBe('today');
  });
  it('profit this week', () => {
    const r = parseMessage('profit this week', products);
    expect(r.intent).toBe('query');
    expect(r.period).toBe('week');
  });
  it('what is low', () => {
    const r = parseMessage('what is low', products);
    expect(r.intent).toBe('query');
    expect(r.query).toBe('low');
  });
  it('stock', () => {
    const r = parseMessage('stock', products);
    expect(r.intent).toBe('query');
    expect(r.query).toBe('stock');
  });
  it('best seller', () => {
    const r = parseMessage('best seller', products);
    expect(r.intent).toBe('query');
    expect(r.query).toBe('best');
  });
  it('how much did I sell today', () => {
    const r = parseMessage('how much did I sell today', products);
    expect(r.intent).toBe('query');
    expect(['sales', 'profit']).toContain(r.query);
  });
});

describe('parseMessage unknown and clarify', () => {
  it('never crashes on junk', () => {
    const r = parseMessage('asdfgh qwerty', products);
    expect(r.intent).toBe('unknown');
    expect(r.reply).toMatch(/sold 3 bread/i);
  });
  it('unknown product asks to add it', () => {
    const r = parseMessage('sold 2 xyzabc', products);
    expect(r.intent).toBe('unknown');
  });
  it('empty message is unknown', () => {
    expect(parseMessage('   ', products).intent).toBe('unknown');
  });
  it('clarifies similar bread products when needed', () => {
    const r = parseMessage('sold 2 bread', [
      { id: 1, name: 'Bread', aliases: '' },
      { id: 9, name: 'Brown Bread', aliases: '' },
    ]);
    expect(['sale', 'clarify']).toContain(r.intent);
  });
});
