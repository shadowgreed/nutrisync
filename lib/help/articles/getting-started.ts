import type { Article } from '../types'

const UPDATED = '2026-06-21'
const V = '1.0'

export const gettingStarted: Article[] = [
  {
    id: 'gs-what-is-nutrisync',
    slug: 'what-is-nutrisync',
    title: 'What is NutriSync?',
    category: 'getting-started',
    tags: ['intro', 'overview', 'about', 'what is'],
    summary: 'A quick tour of what NutriSync does and how it helps you eat better with friends.',
    overview:
      'NutriSync is a nutrition tracker built around accountability. You log meals in seconds — usually by snapping a photo — and get instant calories, macros, and micronutrients. Then you share progress with a private group, cheer each other on, and run challenges to stay consistent.',
    steps: [
      'Log a meal by photo, search, or barcode to see its nutrition.',
      'Watch your daily calorie budget, hydration, and nutrient gaps update.',
      'Join or create a group to share progress with people you trust.',
      'Start a challenge to turn good habits into a streak.',
    ],
    tips: [
      'You do not need to log perfectly. Consistency beats accuracy — a quick estimate every day is better than a precise log once a week.',
      'The social side is the secret sauce: people who log with a group stick with it far longer.',
    ],
    faqs: [
      { q: 'Is NutriSync free?', a: 'The core tracking features are free. Some advanced coaching features are part of a paid plan — see Account & Billing.' },
      { q: 'Do I have to use groups?', a: 'No. You can track entirely on your own. Groups are optional, but they are what make habits stick.' },
    ],
    related: ['getting-started', 'logging-your-first-meal', 'understanding-your-dashboard'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'gs-getting-started',
    slug: 'getting-started',
    title: 'Getting started',
    category: 'getting-started',
    tags: ['setup', 'first steps', 'onboarding', 'begin'],
    summary: 'The first few things to do after you create your account.',
    overview:
      'Setting up takes about two minutes. During onboarding you tell NutriSync a little about yourself so it can calculate an accurate daily calorie target and nutrient goals. You can change any of this later in your profile.',
    steps: [
      'Create your account and confirm your email.',
      'Enter your basics: height, weight, age, and biological sex (used only to estimate your calorie needs).',
      'Choose your activity level — how active you are on a normal day.',
      'Pick your goal: lose weight, maintain, build muscle, or improve health.',
      'Log your first meal to see your dashboard come to life.',
    ],
    tips: [
      'Be honest about your activity level. Overestimating it inflates your calorie target.',
      'You can edit every one of these answers later from Profile → Edit.',
    ],
    faqs: [
      { q: 'Why does it ask for my weight and height?', a: 'They are used to estimate how many calories your body burns at rest, which sets your daily target. Your numbers are private.' },
      { q: 'Can I skip onboarding?', a: 'You can move quickly, but entering your basics is what makes your calorie and nutrient targets accurate.' },
    ],
    related: ['setting-goals', 'understanding-calorie-targets', 'logging-your-first-meal'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'gs-setting-goals',
    slug: 'setting-goals',
    title: 'Setting your goals',
    category: 'getting-started',
    tags: ['goals', 'lose weight', 'build muscle', 'maintain', 'target'],
    summary: 'How your goal shapes your calorie target and what each option means.',
    overview:
      'Your goal tells NutriSync how to adjust your daily calorie target. It is the single biggest lever on your numbers, so pick the one that matches what you want right now. You can change it anytime.',
    steps: [
      'Go to Profile → Edit.',
      'Open the Goal setting.',
      'Choose one: Lose weight, Maintain, Build muscle, or Improve health.',
      'Save. Your calorie target updates immediately.',
    ],
    tips: [
      'Lose weight applies a moderate daily calorie deficit (about 500 kcal) for roughly half a kilo per week.',
      'Build muscle adds a small surplus so you have fuel to train and grow.',
      'Maintain and Improve health keep you at your estimated daily needs.',
    ],
    faqs: [
      { q: 'Can I have more than one goal?', a: 'Your calorie target follows your primary goal. You can still track everything else (activity, nutrients, water) regardless of the goal you pick.' },
      { q: 'How often should I change my goal?', a: 'Only when your intention changes. Switching constantly makes it hard to see whether an approach is working.' },
    ],
    related: ['understanding-calorie-targets', 'goal-progress', 'updating-profile'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'gs-first-meal',
    slug: 'logging-your-first-meal',
    title: 'Logging your first meal',
    category: 'getting-started',
    tags: ['log', 'first meal', 'photo', 'food', 'add meal'],
    summary: 'The fastest way to log a meal and see your nutrition for the day.',
    overview:
      'The quickest way to log is a photo: NutriSync estimates the foods and their nutrition for you. You can also search a food by name or scan a barcode. Every meal counts toward your daily budget and your logging streak.',
    steps: [
      'Tap the + (log) button.',
      'Snap or choose a photo of your meal — or switch to Search or Barcode.',
      'Review the detected foods and adjust portion size if needed (small / medium / large, or a quantity).',
      'Pick the meal type (breakfast, lunch, dinner, or snack).',
      'Save. Your dashboard and streak update right away.',
    ],
    tips: [
      'Good lighting and a top-down photo improve the estimate.',
      'You can edit anything after saving, so do not worry about getting it perfect the first time.',
    ],
    faqs: [
      { q: 'What if the photo guesses wrong?', a: 'Tap the meal to edit it — change a food, adjust the portion, or remove an item. See Editing meals.' },
      { q: 'Does a snack count toward my streak?', a: 'Yes. Any logged meal that day keeps your streak alive.' },
    ],
    related: ['logging-food', 'using-food-photos', 'editing-meals'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'gs-dashboard',
    slug: 'understanding-your-dashboard',
    title: 'Understanding your dashboard',
    category: 'getting-started',
    tags: ['dashboard', 'home', 'budget', 'rings', 'overview'],
    summary: 'What each number on your home screen means.',
    overview:
      'Your dashboard is the daily snapshot: how many calories you have left, how your macros and key nutrients are tracking, your hydration, and your current streak. It resets each day at midnight in your local time.',
    steps: [
      'Open the Today tab.',
      'Check your calorie budget — calories eaten vs. your daily target.',
      'Scan your macros (protein, carbs, fat, fiber) and nutrient progress.',
      'Log water as you drink it, and glance at your streak up top.',
    ],
    tips: [
      'Tap into a meal from the day to review or edit its full breakdown.',
      'The quick-log button is always available to add a meal, water, or weight in a couple of taps.',
    ],
    faqs: [
      { q: 'When does my day reset?', a: 'At midnight in your device’s local time. Meals are grouped by the local day you logged them.' },
      { q: 'Why is my calorie budget different from a friend’s?', a: 'Targets are personal — they depend on your body stats, activity level, and goal.' },
    ],
    related: ['understanding-calorie-targets', 'understanding-macros', 'daily-calorie-averages'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'gs-calorie-targets',
    slug: 'understanding-calorie-targets',
    title: 'Understanding calorie targets',
    category: 'getting-started',
    tags: ['calorie target', 'tdee', 'bmr', 'budget', 'how calculated'],
    summary: 'How NutriSync calculates your daily calorie target.',
    overview:
      'Your target is built from two things: how many calories your body burns, and your goal. NutriSync estimates the calories you burn at rest from your height, weight, age, and sex, scales that up by your activity level, then adjusts for your goal.',
    steps: [
      'Resting burn is estimated from your body stats (the Mifflin-St Jeor formula).',
      'That is multiplied by your activity level to estimate total daily burn.',
      'Your goal adjusts the number — a deficit to lose weight, a surplus to build muscle, or no change to maintain.',
      'The result is your daily calorie target shown on the dashboard.',
    ],
    tips: [
      'Keeping your weight up to date keeps your target accurate as you progress.',
      'A target is a guide, not a hard rule. Trends over a week matter more than any single day.',
    ],
    faqs: [
      { q: 'Why did my target change?', a: 'It updates when you change your weight, activity level, or goal. Each of those feeds the calculation.' },
      { q: 'Can I set my target manually?', a: 'NutriSync sets it from your profile so it stays consistent with your stats. Update your profile to move it.' },
    ],
    related: ['setting-goals', 'understanding-calorie-estimates', 'daily-calorie-averages'],
    lastUpdated: UPDATED, version: V,
  },
]
