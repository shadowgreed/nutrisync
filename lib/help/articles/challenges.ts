import type { Article } from '../types'

const UPDATED = '2026-06-21'
const V = '1.0'

export const challenges: Article[] = [
  {
    id: 'ch-what',
    slug: 'what-are-challenges',
    title: 'What are challenges?',
    category: 'challenges',
    tags: ['challenge', 'what is', 'competition', 'group goal'],
    summary: 'Time-boxed group goals that turn habits into friendly competition.',
    overview:
      'A challenge is a shared goal your group works toward over a set number of days — like logging a meal every day for two weeks. Everyone’s progress is tracked automatically from what you log, with a leaderboard, a crew total, and daily accountability to keep momentum.',
    steps: [
      'Open the Challenges tab.',
      'Join an active challenge or create a new one.',
      'Log as usual — your progress updates automatically.',
      'Check the leaderboard and today’s status to stay on track.',
    ],
    tips: [
      'Challenges run inside a group, so create or join a group first.',
      'Pick a length you can realistically finish — finishing a 7-day challenge beats abandoning a 30-day one.',
    ],
    faqs: [
      { q: 'Do I have to enter progress manually?', a: 'No. Progress is calculated from your normal logging — meals, activities, or water depending on the challenge.' },
      { q: 'Can everyone win?', a: 'Yes. Challenges are about hitting the goal, not only beating others. The leaderboard adds friendly competition on top.' },
    ],
    related: ['creating-a-challenge', 'challenge-types', 'challenge-rankings'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ch-create',
    slug: 'creating-a-challenge',
    title: 'Creating a challenge',
    category: 'challenges',
    tags: ['create challenge', 'new challenge', 'start challenge', 'setup'],
    summary: 'Set up a challenge for your group in under a minute.',
    overview:
      'Creating a challenge takes a few taps: choose what to track, how long it runs, and a goal. NutriSync suggests a sensible goal for each type and length, and every challenge shows the reward badge you’re working toward.',
    steps: [
      'Open the Challenges tab and tap New (or pick a template on the empty state).',
      'Choose a type from Nutrition, Activity, or Hydration.',
      'Pick a length: 7, 14, or 30 days.',
      'Adjust the goal if you want — a default is filled in for you.',
      'Give it a title and tap Start challenge.',
    ],
    tips: [
      'Templates on the empty state (Logging Streak, Water, Activity, Protein) are the fastest way to start.',
      'The creator can delete a challenge; everyone in the group can join and compete.',
    ],
    faqs: [
      { q: 'Who can create challenges?', a: 'Any member of a group can create one for that group.' },
      { q: 'Can I edit a challenge after creating it?', a: 'Challenges are designed to be simple and fair, so the goal and dates stay fixed once started. If you need different settings, delete it and create a new one.' },
    ],
    related: ['what-are-challenges', 'challenge-types', 'challenge-completion'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ch-streak',
    slug: 'streak-challenges',
    title: 'Streak challenges (Logging Streak)',
    category: 'challenges',
    tags: ['streak challenge', 'logging streak', 'log every day', 'daily'],
    summary: 'The classic challenge: log a meal every day.',
    overview:
      'A Logging Streak challenge rewards showing up. Each day you log at least one meal counts as a success. It’s the easiest challenge to win and the best one for building the daily logging habit that powers everything else.',
    steps: [
      'Create a challenge and choose Logging Streak (Nutrition).',
      'Pick a length and start it.',
      'Log at least one meal each day to bank that day.',
      'Watch your streak and your spot on the leaderboard grow.',
    ],
    tips: [
      'A snack counts. The goal is to log something every day, not to log perfectly.',
      'If you’re busy, a quick photo keeps the day — you can refine it later.',
    ],
    faqs: [
      { q: 'What happens if I miss a day?', a: 'You don’t earn that day, but you can keep going and still finish the challenge. Your group can nudge you to get back on track.' },
      { q: 'Is the challenge streak the same as my app streak?', a: 'They’re related but separate. The challenge counts days within the challenge window; your overall streak counts your ongoing daily logging.' },
    ],
    related: ['streak-tracking', 'challenge-types', 'challenge-rankings'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ch-types',
    slug: 'challenge-types',
    title: 'Challenge types',
    category: 'challenges',
    tags: ['types', 'protein', 'micronutrient', 'active days', 'water', 'options'],
    summary: 'The challenge types you can run, across nutrition, activity, and hydration.',
    overview:
      'Challenges come in three categories. Each counts a “successful day” in its own way, and progress is measured automatically from what you log.',
    steps: [
      'Nutrition — Logging Streak: log a meal each day. Protein Push: hit a high-protein day. Micronutrient Master: reach several nutrient targets in a day.',
      'Activity — Active Days: log a workout or activity that day.',
      'Hydration — Water Challenge: drink enough water (a daily threshold) that day.',
      'Pick the one that matches the habit your group wants to build.',
    ],
    tips: [
      'Activity and Water challenges count any day you log a qualifying activity or enough water — easy wins that build real habits.',
      'Rotate challenge types to keep your group engaged across nutrition, movement, and hydration.',
    ],
    faqs: [
      { q: 'Is there a weight-loss challenge?', a: 'Not currently. To keep everyone’s weight private, challenges track logging, nutrition, activity, and hydration rather than the scale. More types may be added over time.' },
      { q: 'How is a “protein day” or “water day” defined?', a: 'Each type has a clear daily threshold shown on the challenge — for example a protein target, or a minimum amount of water.' },
    ],
    related: ['creating-a-challenge', 'understanding-macros', 'challenge-completion'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ch-rankings',
    slug: 'challenge-rankings',
    title: 'Challenge rankings',
    category: 'challenges',
    tags: ['leaderboard', 'rankings', 'rank', 'crew progress', 'standings'],
    summary: 'How the leaderboard, crew progress, and today’s status work.',
    overview:
      'Each challenge shows three views of progress: your personal progress, a leaderboard of everyone in the challenge, and the crew’s combined total. A “today’s status” list shows who has already completed today’s requirement so you know who to cheer.',
    steps: [
      'Open a challenge to see your progress card and current pace.',
      'Scroll the leaderboard — members are ranked by progress, with medals for the top three.',
      'Check Crew progress for the group’s combined percentage toward the goal.',
      'Use Today’s status to cheer finishers and nudge anyone who hasn’t logged.',
    ],
    tips: [
      'Ties are broken by current streak, so consistency pays off.',
      'A status pill (On track / Catch up / Complete) tells you at a glance how you’re pacing.',
    ],
    faqs: [
      { q: 'How is rank decided?', a: 'By how many successful days you’ve earned, highest first. If two people are tied, the longer current streak ranks higher.' },
      { q: 'What is “crew progress”?', a: 'The group’s combined successful days versus the total possible — a shared goal everyone contributes to.' },
    ],
    related: ['challenge-completion', 'encouraging-members', 'what-are-challenges'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ch-completion',
    slug: 'challenge-completion',
    title: 'Challenge completion',
    category: 'challenges',
    tags: ['complete', 'finish', 'reward', 'badge', 'win'],
    summary: 'What it means to complete a challenge and the reward you earn.',
    overview:
      'You complete a challenge when you reach its goal — for example, enough logged days before the end date. Every challenge displays the reward badge you’re working toward, and completing milestones along the way is celebrated in the challenge and your group feed.',
    steps: [
      'Reach the challenge’s goal number of successful days.',
      'Your status switches to Complete and your reward badge unlocks.',
      'Milestone moments (like a 7-day streak or the crew hitting 50%) are highlighted automatically.',
    ],
    tips: [
      'You can keep logging after completing to support your crew’s combined total.',
      'Finishing even a short challenge builds momentum into the next one.',
    ],
    faqs: [
      { q: 'What do I get for completing?', a: 'A reward badge tied to the challenge, plus the streak and habit you built along the way.' },
      { q: 'What if the challenge ends before I reach the goal?', a: 'You keep all the progress and the days you logged. Start another challenge to keep the streak going.' },
    ],
    related: ['challenge-rankings', 'creating-a-challenge', 'streak-tracking'],
    lastUpdated: UPDATED, version: V,
  },
]
