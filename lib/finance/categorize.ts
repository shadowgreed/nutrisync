/**
 * Keyword → category suggestion for imported transactions. Deliberately dumb:
 * first matching rule wins, uppercase substring match on the bank description.
 * The user confirms every suggestion before rows are saved.
 */

export interface CategorySuggestion {
  category: string
  subcategory: string | null
}

const RULES: Array<[keywords: string[], category: string, subcategory: string | null]> = [
  // Income (bank CSVs show deposits as negative amounts → callers also flag by sign)
  [['FEDEX'], 'Income', 'FedEx'],
  [['AMAZON FLEX', 'AMZN FLEX'], 'Income', 'Amazon Flex'],
  [['PAYROLL', 'DIRECT DEP', 'DEPOSIT'], 'Income', 'Other'],
  // Home
  [['RENT'], 'Home', 'Rent'],
  [['ELECTRIC', 'EVERSOURCE', 'NATIONAL GRID'], 'Home', 'Electricity'],
  [['T-MOBILE', 'TMOBILE', 'VERIZON', 'AT&T', 'MINT MOBILE'], 'Home', 'Phone'],
  [['COMCAST', 'XFINITY', 'SPECTRUM', 'INTERNET'], 'Home', 'Internet'],
  // Transport
  [['SHELL', 'MOBIL', 'EXXON', 'SUNOCO', 'GULF OIL', 'CUMBERLAND', 'SPEEDWAY', 'CITGO', 'BP#', 'FUEL'], 'Transport', 'Fuel'],
  [['GEICO', 'PROGRESSIVE', 'ALLSTATE', 'STATE FARM'], 'Transport', 'Insurance'],
  [['AAA '], 'Transport', 'AAA'],
  [['TOYOTA FIN', 'HONDA FIN', 'CAPITAL ONE AUTO', 'ALLY AUTO', 'CAR PAYMENT'], 'Transport', 'Vehicle Payment'],
  // Daily
  [['STOP & SHOP', 'STOP&SHOP', 'MARKET BASKET', 'ALDI', 'WHOLE FOODS', 'TRADER JOE', 'SHAWS', 'WEGMANS', 'GROCER', 'PRICE RITE', 'BJS WHOLESALE', 'COSTCO WHSE'], 'Daily', 'Groceries'],
  [['MCDONALD', 'DUNKIN', 'STARBUCKS', 'CHIPOTLE', 'WENDY', 'BURGER KING', 'TACO BELL', 'DOORDASH', 'UBER EATS', 'GRUBHUB', 'PIZZA', 'RESTAURANT', 'CHICK-FIL-A', 'PANERA', 'SUBWAY'], 'Daily', 'Dining Out'],
  [['MARSHALLS', 'TJ MAXX', 'TJMAXX', 'OLD NAVY', 'BURLINGTON', 'ROSS ', 'KOHLS'], 'Daily', 'Clothing'],
  [['SALON', 'BARBER', 'NAILS'], 'Daily', 'Salon'],
  [['LIQUOR', 'WINE', 'BREWERY', 'PACKAGE STORE'], 'Daily', 'Alcohol'],
  // Standalone categories
  [['CVS', 'WALGREENS', 'RITE AID', 'PHARMACY', 'DENTAL', 'MEDICAL'], 'Health', null],
  [['NETFLIX', 'SPOTIFY', 'HULU', 'DISNEY PLUS', 'DISNEY+', 'APPLE.COM/BILL', 'YOUTUBE PREM', 'HBO', 'PARAMOUNT'], 'Subscriptions', null],
  [['AMC ', 'CINEMA', 'REGAL', 'TICKETMASTER', 'STEAM', 'PLAYSTATION', 'XBOX'], 'Entertainment', null],
  // Debt payments (card payments from checking)
  [['PAYPAL CREDIT', 'SYNCB', 'JETBLUE', 'BARCLAYCARD', 'BK OF AMER', 'BANK OF AMERICA PAYMENT', 'CITIZENS PAY', 'APPLECARD', 'GS BANK', 'CARD PAYMENT', 'CARDMEMBER SERV'], 'Debt Payment', null],
]

export function suggestCategory(description: string): CategorySuggestion | null {
  const d = description.toUpperCase()
  for (const [keywords, category, subcategory] of RULES) {
    if (keywords.some(k => d.includes(k))) return { category, subcategory }
  }
  return null
}
