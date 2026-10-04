/**
 * Single keyword dictionary for the rule-based chat parser.
 * Add Shona or slang here — the parser stays offline.
 */
export const DICTIONARY = {
  sale: ['sold', 'sell', 'sale', 'ndatengesa', 'tengesa', 'ndatengesa'],
  restock: ['bought', 'buy', 'restocked', 'restock', 'ndatenga', 'tenga'],
  expense: ['spent', 'paid', 'pay', 'ndashandisa', 'shandisa'],
  withdrawal: ['took', 'withdrew', 'withdraw', 'ndatora'],
  undo: ['undo', 'cancel last', 'reverse', 'dzosa'],
  homeHints: ['home', 'house', 'myself', 'personal', 'kumba'],
  query: {
    profit: ['profit', 'profet', 'profet', 'purofiti'],
    stock: ['stock', 'stocks', 'inventory'],
    low: ['low', 'finished', 'out', 'shortage'],
    best: ['best', 'top', 'fast'],
    sold: ['sell today', 'sold today', 'how much did i sell', 'sales today'],
  },
  periods: {
    today: ['today', 'nhasi'],
    week: ['week', 'svondo', 'this week'],
    month: ['month', 'mwedzi', 'this month'],
  },
  expenseCategories: {
    transport: ['transport', 'kombi', 'taxi', 'fuel', 'petrol', 'fare', 'bus'],
    rent: ['rent', 'rental', 'shop rent'],
    airtime_data: ['airtime', 'data', 'bundle', 'whatsapp', 'ecocash'],
    electricity: ['electricity', 'zesa', 'power', 'units'],
    wages: ['wages', 'salary', 'helper', 'staff'],
    supplies: ['supplies', 'bags', 'packaging', 'wrapping'],
    other: ['other', 'misc'],
  },
};

export const EXAMPLE_HINT = 'I did not understand. Try: sold 3 bread';
