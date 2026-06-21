import type { Article } from '../types'

const UPDATED = '2026-06-21'
const V = '1.0'

export const foodLogging: Article[] = [
  {
    id: 'fl-logging-food',
    slug: 'logging-food',
    title: 'Logging food',
    category: 'food-logging',
    tags: ['log food', 'add meal', 'search', 'barcode', 'photo'],
    summary: 'The three ways to log a meal: photo, search, and barcode.',
    overview:
      'You can log food three ways. A photo is fastest and gets you calories, macros, and micronutrients automatically. Search is great when you know the food’s name. Barcode is best for packaged products. Mix and match within a single meal.',
    steps: [
      'Tap the + (log) button.',
      'Choose Photo, Search, or Barcode.',
      'Add one or more foods to the meal.',
      'Set the portion for each item and choose the meal type.',
      'Save.',
    ],
    tips: [
      'You can add several foods to one meal before saving.',
      'Add an optional caption or photo so your group sees what you ate in the feed.',
    ],
    faqs: [
      { q: 'Can I log past meals?', a: 'Yes — log the meal and adjust its date/time while editing so it lands on the right day.' },
      { q: 'Do I need internet to log?', a: 'Photo estimates and search need a connection. Try again once you’re back online if something fails to save.' },
    ],
    related: ['using-food-photos', 'understanding-calorie-estimates', 'editing-meals'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'fl-photos',
    slug: 'using-food-photos',
    title: 'Using food photos',
    category: 'food-logging',
    tags: ['photo', 'camera', 'ai', 'estimate', 'picture'],
    summary: 'How photo logging works and how to get the best estimates.',
    overview:
      'When you log by photo, NutriSync identifies the foods on your plate and estimates their nutrition. It is designed for speed — a few seconds instead of hunting through a database. You always get to review and adjust before saving.',
    steps: [
      'Tap + and choose Photo.',
      'Take a clear, top-down photo of the whole plate.',
      'Wait a moment while the foods are detected.',
      'Review each item, fix anything that’s off, and set portions.',
      'Save.',
    ],
    tips: [
      'Good light and a straight-down angle give the best results.',
      'Photograph foods before you start eating so portions are easier to estimate.',
      'For mixed dishes, a caption like “chicken burrito bowl” helps you remember and helps the estimate.',
    ],
    faqs: [
      { q: 'How accurate is it?', a: 'It’s an estimate, not a lab measurement. It’s accurate enough to guide daily decisions and spot trends. Adjust portions for a closer number.' },
      { q: 'Are my food photos shared?', a: 'Only if you choose to share the meal to your group. Your privacy mode controls what group members can see — see Group privacy.' },
    ],
    related: ['understanding-calorie-estimates', 'logging-food', 'upload-issues'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'fl-editing',
    slug: 'editing-meals',
    title: 'Editing meals',
    category: 'food-logging',
    tags: ['edit', 'change meal', 'fix', 'portion', 'wrong'],
    summary: 'Change foods, portions, meal type, or time after logging.',
    overview:
      'Nothing you log is locked. Open any meal to swap foods, adjust portions, change the meal type, fix the time, or edit the caption. Your daily totals recalculate instantly.',
    steps: [
      'Open the meal from your dashboard or the group feed.',
      'Tap Edit.',
      'Change foods, portion sizes, the meal type, or the date/time.',
      'Save your changes.',
    ],
    tips: [
      'Adjusting the portion (small / medium / large or a quantity) is the quickest way to correct calories.',
      'If a photo missed an item, add it from the same edit screen.',
    ],
    faqs: [
      { q: 'Will editing change my streak?', a: 'No, as long as a meal still exists for that day. Streaks count days with at least one logged meal.' },
      { q: 'Can I move a meal to a different day?', a: 'Yes — edit its date/time and it moves to that day’s totals.' },
    ],
    related: ['deleting-meals', 'logging-food', 'missing-meals'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'fl-deleting',
    slug: 'deleting-meals',
    title: 'Deleting meals',
    category: 'food-logging',
    tags: ['delete', 'remove meal', 'undo', 'mistake'],
    summary: 'Remove a meal you logged by mistake.',
    overview:
      'If you logged something twice or by accident, you can delete it. Deleting removes it from your daily totals and from your group feed.',
    steps: [
      'Open the meal you want to remove.',
      'Tap Edit or the meal’s menu.',
      'Choose Delete and confirm.',
    ],
    tips: [
      'If a meal is just wrong rather than unwanted, edit it instead of deleting — that keeps your streak and history intact.',
      'Deleting the only meal on a day can break that day’s streak.',
    ],
    faqs: [
      { q: 'Can I undo a delete?', a: 'Deletes are permanent. If you’re unsure, edit the meal instead.' },
      { q: 'Does deleting remove it from my group?', a: 'Yes. Once deleted, it no longer appears in the group feed.' },
    ],
    related: ['editing-meals', 'logging-food', 'streak-tracking'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'fl-breakdowns',
    slug: 'understanding-nutrition-breakdowns',
    title: 'Understanding nutrition breakdowns',
    category: 'food-logging',
    tags: ['nutrition', 'breakdown', 'details', 'calories', 'macros', 'micros'],
    summary: 'What the numbers on a meal mean — calories, macros, and nutrients.',
    overview:
      'Every meal shows three layers: total calories, macronutrients (protein, carbs, fat, fiber), and micronutrients (key vitamins and minerals). Together they tell you not just how much you ate, but how nourishing it was.',
    steps: [
      'Open any meal.',
      'See total calories at the top.',
      'Review the macro split below it.',
      'Expand the nutrients to see vitamins and minerals the meal contributed.',
    ],
    tips: [
      'Two meals with the same calories can have very different nutrient value — the breakdown shows you which.',
      'Use it to spot easy wins, like adding a food that fills a recurring nutrient gap.',
    ],
    faqs: [
      { q: 'Why are some nutrients zero?', a: 'Either the food contains little of that nutrient, or the estimate couldn’t determine it. Logging a variety of foods fills the picture.' },
      { q: 'Where do daily totals come from?', a: 'They’re the sum of every meal you logged that day.' },
    ],
    related: ['understanding-macros', 'understanding-micronutrients', 'understanding-calorie-estimates'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'fl-calorie-estimates',
    slug: 'understanding-calorie-estimates',
    title: 'Understanding calorie estimates',
    category: 'food-logging',
    tags: ['calorie estimate', 'accuracy', 'how accurate', 'photo calories'],
    summary: 'Why calorie numbers are estimates and how to make them more accurate.',
    overview:
      'Calorie numbers — especially from photos — are estimates. Portion size, cooking method, and hidden ingredients like oil all affect the real number. NutriSync aims to be close enough to guide daily choices and reveal weekly trends.',
    steps: [
      'After logging, check the portion size on each food.',
      'Bump it up or down (small / medium / large or a quantity) to match what you actually ate.',
      'For packaged foods, use the barcode for the most exact numbers.',
    ],
    tips: [
      'Don’t chase perfection. Consistent estimates reveal trends even if any single number is a little off.',
      'Oils and dressings add up fast — add them if a photo missed them.',
    ],
    faqs: [
      { q: 'Why is my estimate different from the package?', a: 'Photo estimates are based on what’s visible. For exact label values, log the item by barcode or search.' },
      { q: 'Should I weigh my food?', a: 'You don’t have to. Weighing improves accuracy, but a reasonable portion estimate is enough for most people.' },
    ],
    related: ['using-food-photos', 'understanding-nutrition-breakdowns', 'incorrect-calories'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'fl-macros',
    slug: 'understanding-macros',
    title: 'Understanding macros',
    category: 'food-logging',
    tags: ['macros', 'protein', 'carbs', 'fat', 'fiber'],
    summary: 'What macronutrients are and how to use them.',
    overview:
      'Macronutrients — protein, carbs, fat, and fiber — are the nutrients your body needs in large amounts and the ones that make up your calories. NutriSync tracks all four so you can see the shape of your diet, not just its size.',
    steps: [
      'Open the Today tab to see your macro progress for the day.',
      'Tap a meal to see its individual macro contribution.',
      'Aim to hit protein and fiber consistently — they support muscle and digestion.',
    ],
    tips: [
      'Protein is the macro most people under-eat; it also keeps you full.',
      'Fiber comes from whole foods like vegetables, fruit, beans, and whole grains.',
    ],
    faqs: [
      { q: 'What’s a good macro split?', a: 'It depends on your goal. A simple start: prioritize protein, get enough fiber, and let carbs and fat fill the rest within your calorie target.' },
      { q: 'Do macros have to add up exactly?', a: 'No. Use them as a guide. Hitting protein and fiber most days matters more than precise ratios.' },
    ],
    related: ['understanding-micronutrients', 'understanding-nutrition-breakdowns', 'challenge-types'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'fl-micros',
    slug: 'understanding-micronutrients',
    title: 'Understanding micronutrients',
    category: 'food-logging',
    tags: ['micronutrients', 'vitamins', 'minerals', 'iron', 'vitamin d'],
    summary: 'The vitamins and minerals NutriSync tracks and why they matter.',
    overview:
      'Micronutrients are the vitamins and minerals your body needs in smaller amounts but can’t function without. NutriSync tracks ten of the ones people most often fall short on: vitamin D, vitamin C, B12, iron, calcium, magnesium, zinc, potassium, omega-3, and folate.',
    steps: [
      'Open the Today tab and scroll to your nutrient progress.',
      'Spot which nutrients are green (on track) versus low.',
      'Tap a low nutrient to see foods that are rich in it.',
      'Log a food that closes the gap.',
    ],
    tips: [
      'You rarely need supplements to fix a gap — a single well-chosen food often does it.',
      'Variety is the easiest path to full nutrient coverage.',
    ],
    faqs: [
      { q: 'Why focus on these ten?', a: 'They’re common shortfalls that affect energy, mood, immunity, and long-term health, and they respond well to small food swaps.' },
      { q: 'What counts as “on track”?', a: 'A nutrient is on track when your intake reaches its daily target. Weekly summaries highlight your best and weakest nutrients.' },
    ],
    related: ['understanding-macros', 'challenge-types', 'weekly-summaries'],
    lastUpdated: UPDATED, version: V,
  },
]
