/**
 * Seed data + defaults for the finance module. Balances/minimums in cents,
 * APRs in basis points. APRs are statement placeholders — every card field is
 * editable in the debt view, and the avalanche order re-sorts automatically.
 */

export interface SeedCard {
  name: string
  balanceCents: number
  aprBp: number
  minPaymentCents: number
}

/** Listed in avalanche order for readability; the engine sorts by APR itself. */
export const SEED_CARDS: SeedCard[] = [
  { name: 'PayPal', balanceCents: 170300, aprBp: 2999, minPaymentCents: 5700 },
  { name: 'JetBlue', balanceCents: 1050500, aprBp: 2724, minPaymentCents: 35400 },
  { name: 'Apple', balanceCents: 90000, aprBp: 2624, minPaymentCents: 0 },
  { name: 'Bank of America', balanceCents: 247600, aprBp: 2424, minPaymentCents: 7500 },
  { name: 'Citizens', balanceCents: 484900, aprBp: 2224, minPaymentCents: 14600 },
]

/** The debt progress bar runs from this starting total down to $0. */
export const STARTING_DEBT_CENTS = SEED_CARDS.reduce((s, c) => s + c.balanceCents, 0) // $20,433

export const BUFFER_TARGET_CENTS = 100_000        // $1,000 cash buffer goal
export const DEFAULT_DEBT_BUDGET_CENTS = 160_000  // $1,600/mo toward the plan
export const DEFAULT_BUFFER_MONTHLY_CENTS = 50_000 // $500/mo until buffer full

/** Budget rows that persist the two payoff-plan knobs (see finance_budgets). */
export const BUDGET_KEY_DEBT = 'Debt Payment'
export const BUDGET_KEY_BUFFER = 'Savings'

export const SEED_CATEGORIES: Array<{ name: string; parent: string | null }> = [
  { name: 'Income', parent: null },
  { name: 'FedEx', parent: 'Income' },
  { name: 'Amazon Flex', parent: 'Income' },
  { name: 'Other', parent: 'Income' },
  { name: 'Home', parent: null },
  { name: 'Rent', parent: 'Home' },
  { name: 'Electricity', parent: 'Home' },
  { name: 'Phone', parent: 'Home' },
  { name: 'Internet', parent: 'Home' },
  { name: 'Transport', parent: null },
  { name: 'Vehicle Payment', parent: 'Transport' },
  { name: 'Insurance', parent: 'Transport' },
  { name: 'Fuel', parent: 'Transport' },
  { name: 'AAA', parent: 'Transport' },
  { name: 'Daily', parent: null },
  { name: 'Groceries', parent: 'Daily' },
  { name: 'Dining Out', parent: 'Daily' },
  { name: 'Clothing', parent: 'Daily' },
  { name: 'Salon', parent: 'Daily' },
  { name: 'Alcohol', parent: 'Daily' },
  { name: 'Health', parent: null },
  { name: 'Gifts', parent: null },
  { name: 'Entertainment', parent: null },
  { name: 'Subscriptions', parent: null },
  { name: 'Savings', parent: null },
  { name: 'Debt Payment', parent: null },
  { name: 'Misc', parent: null },
]

/** Top-level category names (what the transaction list filters on). */
export const TOP_LEVEL_CATEGORIES = SEED_CATEGORIES.filter(c => c.parent === null).map(c => c.name)
