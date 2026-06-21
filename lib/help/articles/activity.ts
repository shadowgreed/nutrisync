import type { Article } from '../types'

const UPDATED = '2026-06-21'
const V = '1.0'

export const activity: Article[] = [
  {
    id: 'ac-logging',
    slug: 'logging-activities',
    title: 'Logging activities',
    category: 'activity',
    tags: ['activity', 'workout', 'exercise', 'log workout', 'add activity'],
    summary: 'How to log a workout and get an estimated calorie burn.',
    overview:
      'Logging activity rounds out your day. Pick what you did, how long, and how hard — NutriSync estimates the calories you burned. For walks, runs, rides, and hikes you can log distance (and steps) instead of guessing.',
    steps: [
      'Tap the + (log) button and choose Activity.',
      'Pick an activity type (walking, running, cycling, weight training, yoga, and more).',
      'Enter how long you did it, and set the intensity if asked.',
      'For distance activities, enter distance or steps instead of duration.',
      'Save — your estimated burn is added to your day.',
    ],
    tips: [
      'Even a short walk counts. Logging it builds the habit and your active-days streak.',
      'Activities you share appear in your group feed so your crew can cheer them.',
    ],
    faqs: [
      { q: 'Does activity raise my calorie budget?', a: 'NutriSync shows your activity and its estimated burn alongside your intake so you can see the full picture for the day.' },
      { q: 'Can my group see my workouts?', a: 'Group members can see activity you share, the same way meals work. Your privacy settings apply.' },
    ],
    related: ['understanding-calorie-burn', 'steps-vs-distance', 'editing-activities'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ac-burn',
    slug: 'understanding-calorie-burn',
    title: 'Understanding calorie burn',
    category: 'activity',
    tags: ['calorie burn', 'calories burned', 'met', 'estimate'],
    summary: 'How NutriSync estimates the calories you burn during activity.',
    overview:
      'Calorie burn is estimated from the type of activity, how long you did it, the intensity, and your body weight. Harder activities and longer durations burn more; heavier bodies burn more for the same movement. It’s a solid estimate, not a device-measured number.',
    steps: [
      'Log an activity with its duration (or distance) and intensity.',
      'NutriSync combines that with your current weight to estimate the burn.',
      'See the estimate on the activity and in your day’s totals.',
    ],
    tips: [
      'Keeping your weight current keeps burn estimates accurate.',
      'Intensity matters: an easy jog and an all-out run of the same length burn different amounts.',
    ],
    faqs: [
      { q: 'Why is my burn different from my watch?', a: 'Wearables use heart-rate sensors; NutriSync uses a formula based on activity type, time, intensity, and weight. Expect them to be close but not identical.' },
      { q: 'Should I “eat back” my burned calories?', a: 'That’s a personal choice. NutriSync shows the numbers; how you use them is up to you and your goal.' },
    ],
    related: ['logging-activities', 'activity-estimates-explained', 'steps-vs-distance'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ac-editing',
    slug: 'editing-activities',
    title: 'Editing activities',
    category: 'activity',
    tags: ['edit activity', 'change workout', 'fix activity', 'delete activity'],
    summary: 'Fix the details of a logged activity or remove it.',
    overview:
      'Logged the wrong duration or activity type? Open the activity to change any detail, and the calorie estimate updates. You can also delete an activity you added by mistake.',
    steps: [
      'Open the activity from your dashboard or the group feed.',
      'Tap Edit.',
      'Update the type, duration, intensity, distance, or steps.',
      'Save — or choose Delete to remove it.',
    ],
    tips: [
      'Editing the intensity is the quickest way to correct an estimate that feels too high or low.',
      'If you double-logged the same workout, delete the duplicate.',
    ],
    faqs: [
      { q: 'Does editing activity affect challenges?', a: 'Active-days challenges count any day with a logged activity, so editing details won’t drop a day as long as one activity remains.' },
      { q: 'Can I change the date of an activity?', a: 'Yes, edit its date/time to move it to the correct day.' },
    ],
    related: ['logging-activities', 'understanding-calorie-burn', 'challenge-types'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ac-steps-distance',
    slug: 'steps-vs-distance',
    title: 'Steps vs distance',
    category: 'activity',
    tags: ['steps', 'distance', 'walking', 'running', 'cycling', 'hiking'],
    summary: 'When to log steps and when to log distance.',
    overview:
      'For foot-based activities like walking, running, and hiking you can log either steps or distance — whichever you have. Cycling uses distance only (there are no steps). NutriSync converts between them to estimate your effort and calorie burn.',
    steps: [
      'Choose a distance activity (walking, running, cycling, or hiking).',
      'Enter distance if you tracked it, or steps for walking, running, and hiking.',
      'NutriSync converts steps to distance automatically when needed.',
      'Save to see the estimated burn.',
    ],
    tips: [
      'Use whichever number you actually have — there’s no need to convert by hand.',
      'Cycling covers more distance per minute than walking, so it’s logged by distance, not steps.',
    ],
    faqs: [
      { q: 'How are steps turned into distance?', a: 'NutriSync uses an average stride length to convert steps to kilometers, then estimates burn from there.' },
      { q: 'Which is more accurate?', a: 'Distance you measured (GPS) is usually most accurate. Steps are a great fallback.' },
    ],
    related: ['logging-activities', 'understanding-calorie-burn', 'activity-estimates-explained'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ac-estimates',
    slug: 'activity-estimates-explained',
    title: 'Activity estimates explained',
    category: 'activity',
    tags: ['estimate', 'accuracy', 'why', 'calories burned', 'met value'],
    summary: 'Why activity calories are estimates and what affects them.',
    overview:
      'Each activity has a typical energy cost for its intensity. NutriSync multiplies that by your weight and how long you moved to estimate calories. Because it doesn’t measure your heart or effort directly, treat the number as a well-grounded estimate.',
    steps: [
      'Pick the activity type that best matches what you did.',
      'Set the intensity honestly — it changes the energy cost.',
      'Enter accurate duration or distance.',
      'Keep your weight updated for the closest estimate.',
    ],
    tips: [
      'If two activities feel different but log the same, the intensity setting is usually the lever.',
      'Estimates are most useful as trends — compare week to week, not workout to workout.',
    ],
    faqs: [
      { q: 'Why doesn’t it match my treadmill?', a: 'Machines and apps each use their own model. Small differences between estimates are normal.' },
      { q: 'Is “Other” accurate?', a: 'For activities not in the list, “Other” uses a moderate average. Pick the closest specific type when you can for a better estimate.' },
    ],
    related: ['understanding-calorie-burn', 'steps-vs-distance', 'logging-activities'],
    lastUpdated: UPDATED, version: V,
  },
]
