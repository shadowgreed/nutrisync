import type { Article } from '../types'

const UPDATED = '2026-06-21'
const V = '1.0'

export const progress: Article[] = [
  {
    id: 'pr-weight-trends',
    slug: 'weight-trends',
    title: 'Weight trends',
    category: 'progress',
    tags: ['weight', 'trend', 'graph', 'scale', 'progress'],
    summary: 'How to log weight and read your trend over time.',
    overview:
      'Daily weight bounces around from water, food, and sleep — a single number can be misleading. NutriSync charts your weigh-ins over time so you can see the real direction. Log regularly and watch the trend, not the day-to-day noise.',
    steps: [
      'Use the quick-log button and choose Log weight (or update it from your profile).',
      'Enter your weight.',
      'Open the Trends tab to see your weight chart over time.',
      'Look at the line’s direction across weeks, not single days.',
    ],
    tips: [
      'Weigh in at a consistent time — first thing in the morning works well.',
      'Expect ups and downs. A trend over 2–4 weeks tells the truth.',
    ],
    faqs: [
      { q: 'How often should I weigh in?', a: 'A few times a week is plenty to see a trend. Daily is fine too, as long as you focus on the line, not the number.' },
      { q: 'Does updating my weight change my calorie target?', a: 'Yes. A current weight keeps your calorie target and activity estimates accurate.' },
    ],
    related: ['goal-progress', 'understanding-calorie-targets', 'weekly-summaries'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'pr-streak-tracking',
    slug: 'streak-tracking',
    title: 'Streak tracking',
    category: 'progress',
    tags: ['streak', 'how streaks work', 'streak tracking', 'consecutive days', 'fire'],
    summary: 'How streaks are counted and what keeps them alive.',
    overview:
      'Your streak is the number of days in a row you’ve logged at least one meal. It’s the simplest measure of consistency — the thing that actually drives results. Streaks reward showing up, not perfection.',
    steps: [
      'Log at least one meal each day to keep your streak going.',
      'See your current streak on your dashboard and profile.',
      'If you haven’t logged yet today, your streak is safe until the day ends.',
    ],
    tips: [
      'A snack counts. The bar is “log something,” not “log a perfect day.”',
      'There’s a short grace so the streak doesn’t read as broken before you’ve logged today.',
    ],
    faqs: [
      { q: 'Why didn’t my streak go up?', a: 'A streak counts days, not meals — logging twice in one day doesn’t add two. It increases once per day you log. See Streak not updating in Troubleshooting.' },
      { q: 'What breaks a streak?', a: 'A full calendar day with no logged meal. Log daily — even quickly — to keep it.' },
    ],
    related: ['challenge-progress-issues', 'goal-progress', 'understanding-your-dashboard'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'pr-goal-progress',
    slug: 'goal-progress',
    title: 'Goal progress',
    category: 'progress',
    tags: ['goal progress', 'remaining', 'target weight', 'progress bar'],
    summary: 'See how far you’ve come toward your goal.',
    overview:
      'NutriSync shows progress toward your goal in plain terms — like how much weight remains to your target, your average daily calories versus target, and how many active days you’ve hit this week. It’s your “am I on track?” at a glance.',
    steps: [
      'Open the Trends tab or your profile.',
      'Check your weight progress toward your target.',
      'Compare your average calories to your target for the week.',
      'Glance at active days and consistency to round out the picture.',
    ],
    tips: [
      'Progress is rarely a straight line. Look for the overall direction.',
      'If progress stalls for a few weeks, revisit your goal or activity level — your needs may have changed.',
    ],
    faqs: [
      { q: 'Why is progress shown as “remaining” instead of exact weights to others?', a: 'To protect privacy, group members never see your absolute weight — only a privacy-safe sense of progress if you choose to share.' },
      { q: 'I set a goal weight but see no bar — why?', a: 'A progress bar needs a current and target weight. Add your target weight in your profile.' },
    ],
    related: ['weight-trends', 'setting-goals', 'weekly-summaries'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'pr-weekly',
    slug: 'weekly-summaries',
    title: 'Weekly summaries',
    category: 'progress',
    tags: ['weekly', 'recap', 'summary', 'report', 'week'],
    summary: 'Your once-a-week recap of calories, nutrients, activity, and hydration.',
    overview:
      'Each week NutriSync recaps how you did: average calories versus target, your strongest and weakest nutrients, active days, and hydration. It’s a quick read that turns a week of logging into one or two things to focus on next.',
    steps: [
      'Open the Weekly recap when it’s ready (you’ll be notified).',
      'Review calories, nutrients, activity, and water for the week.',
      'Note the one nutrient or habit it suggests focusing on.',
      'Carry that focus into the new week.',
    ],
    tips: [
      'The recap is most accurate when you log most days — gaps leave blanks.',
      'Pick a single improvement each week rather than overhauling everything.',
    ],
    faqs: [
      { q: 'When does the weekly summary appear?', a: 'At the end of each week, once there’s enough logged data to summarize.' },
      { q: 'Why does it say “no data”?', a: 'There weren’t enough logs that week. Log more days and next week’s recap will fill in.' },
    ],
    related: ['daily-calorie-averages', 'understanding-micronutrients', 'goal-progress'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'pr-daily-averages',
    slug: 'daily-calorie-averages',
    title: 'Daily calorie averages',
    category: 'progress',
    tags: ['average calories', 'daily average', 'trend', 'calories per day'],
    summary: 'Why your average tells you more than any single day.',
    overview:
      'One day over or under your target means little. Your daily average across the week is what shapes results. NutriSync shows your average calories per logged day next to your target, and colors each day so you can see over and under at a glance.',
    steps: [
      'Open the Trends tab.',
      'Find your average calories per day for the range.',
      'Compare it to your target line.',
      'Scan the daily bars — under target and over target are colored differently.',
    ],
    tips: [
      'Aim for your average to land near your target across the week, not every single day.',
      'A few high days are fine if your average holds. That flexibility is what makes a plan stick.',
    ],
    faqs: [
      { q: 'Why are some bars a different color?', a: 'Bar color shows whether that day was at/under your target or over it — a quick visual of your week. It reflects your data, not your device.' },
      { q: 'Does an unlogged day count as zero?', a: 'Averages are based on days you logged, so a missed day doesn’t drag your average to zero. But logging daily gives the truest picture.' },
    ],
    related: ['understanding-calorie-targets', 'weekly-summaries', 'incorrect-calories'],
    lastUpdated: UPDATED, version: V,
  },
]
