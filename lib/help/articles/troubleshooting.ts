import type { Article } from '../types'

const UPDATED = '2026-06-21'
const V = '1.0'

export const troubleshooting: Article[] = [
  {
    id: 'ts-upload',
    slug: 'upload-issues',
    title: 'Upload issues',
    category: 'troubleshooting',
    tags: ['upload', 'photo not uploading', 'stuck', 'failed', 'image'],
    summary: 'What to do when a meal photo won’t upload.',
    overview:
      'Photo logging needs a connection to analyze the image. If an upload stalls or fails, it’s almost always a network hiccup or a very large image. A few quick checks usually fix it.',
    steps: [
      'Check that you have a stable internet connection.',
      'Try again — re-take or re-select the photo.',
      'If it still fails, close and reopen the app.',
      'As a fallback, log the meal by search or barcode and add the photo later.',
    ],
    tips: [
      'A clear, normally sized photo uploads faster than a huge one.',
      'On a weak connection, switch to Wi-Fi before logging by photo.',
    ],
    faqs: [
      { q: 'My photo is stuck on processing — what now?', a: 'Give it a moment, then retry. If it won’t finish, log by search and attach the photo to the meal afterward.' },
      { q: 'Will I lose the meal if the upload fails?', a: 'No — re-log it once you’re back online. Nothing is saved until it succeeds.' },
    ],
    related: ['using-food-photos', 'logging-food', 'missing-meals'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ts-missing',
    slug: 'missing-meals',
    title: 'Missing meals',
    category: 'troubleshooting',
    tags: ['missing meal', 'disappeared', 'not showing', 'lost log', 'gone'],
    summary: 'Why a meal might not appear and how to find it.',
    overview:
      'A “missing” meal is usually on a different day than expected, didn’t finish saving, or was filtered out by the day you’re viewing. Here’s how to track it down.',
    steps: [
      'Confirm which day you’re viewing — meals are grouped by the local day they were logged.',
      'Check the date/time on the meal if you logged it late at night or early morning.',
      'If a photo upload failed, the meal may not have saved — re-log it.',
      'Pull to refresh, or reopen the app, to resync.',
    ],
    tips: [
      'Late-night meals can land on the next or previous day depending on the time — edit the time to move it.',
      'If you were offline when logging, the save may not have completed.',
    ],
    faqs: [
      { q: 'My meal was there and now it’s gone — why?', a: 'Check whether it was deleted, or whether you’re viewing a different day. Edited times can also move a meal to another day.' },
      { q: 'Does a missing meal affect my streak?', a: 'A day with no saved meal won’t count. Re-log the meal on the correct day to restore it.' },
    ],
    related: ['editing-meals', 'upload-issues', 'streak-tracking'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ts-incorrect-calories',
    slug: 'incorrect-calories',
    title: 'Incorrect calories',
    category: 'troubleshooting',
    tags: ['wrong calories', 'inaccurate', 'too high', 'too low', 'fix calories'],
    summary: 'How to correct a calorie estimate that looks off.',
    overview:
      'Calorie estimates, especially from photos, depend on portion size and hidden ingredients. If a number looks wrong, a quick edit fixes it — and makes future days more accurate too.',
    steps: [
      'Open the meal and tap Edit.',
      'Adjust the portion size (small / medium / large or a quantity) to match what you ate.',
      'Add anything the estimate missed, like oil, dressing, or a side.',
      'For packaged foods, re-log by barcode for exact label values.',
    ],
    tips: [
      'Oils and sauces are common culprits behind “too low” estimates.',
      'A portion that’s one size off is the usual reason a number looks high or low.',
    ],
    faqs: [
      { q: 'Why doesn’t the photo match the package?', a: 'Photos estimate from what’s visible. For exact numbers, log the item by barcode or search.' },
      { q: 'Do I need to be exact?', a: 'No. Aim for close. Consistent estimates still reveal accurate weekly trends.' },
    ],
    related: ['understanding-calorie-estimates', 'editing-meals', 'daily-calorie-averages'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ts-challenge-progress',
    slug: 'challenge-progress-issues',
    title: 'Challenge progress issues',
    category: 'troubleshooting',
    tags: ['challenge not updating', 'streak not updating', 'progress wrong', 'didn’t count'],
    summary: 'Why a streak or challenge day might not have counted.',
    overview:
      'Progress is calculated from what you log, so almost every “it didn’t count” comes down to the type of log, the day it landed on, or a threshold not being met. Here’s how to check.',
    steps: [
      'Confirm you logged the right kind of activity for the challenge — a Water challenge needs water, an Active Days challenge needs an activity.',
      'Check that the log is on the correct local day (late-night logs can shift days).',
      'For threshold challenges (protein, water), confirm you actually reached the daily target.',
      'Reopen the challenge to refresh, and your progress should reflect the log.',
    ],
    tips: [
      'Streaks and challenges count days, not number of logs — logging twice in a day doesn’t add two.',
      'A grace window keeps today’s streak from looking broken before you’ve logged.',
    ],
    faqs: [
      { q: 'Why didn’t my streak increase?', a: 'It increases once per day you log. Logging multiple meals in one day still counts as one day. If a day looks missed, check the meal’s date.' },
      { q: 'My challenge day didn’t count — why?', a: 'Either the log type didn’t match the challenge, it landed on a different day, or a daily threshold wasn’t met.' },
    ],
    related: ['streak-tracking', 'challenge-types', 'missing-meals'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ts-login',
    slug: 'login-problems',
    title: 'Login problems',
    category: 'troubleshooting',
    tags: ['login', 'sign in', 'password', 'can’t log in', 'locked out', 'reset'],
    summary: 'Fixes for trouble signing in.',
    overview:
      'Most sign-in trouble comes from a mistyped email, an old password, or a connection issue. Work through these steps to get back in.',
    steps: [
      'Double-check your email for typos and confirm your connection.',
      'Use “Forgot password” to reset it if you’re unsure.',
      'Make sure you’re using the same sign-in method you signed up with.',
      'Update to the latest app version, then try again.',
    ],
    tips: [
      'Password reset links can land in spam — check there if you don’t see the email.',
      'If you signed up with a provider (like a social login), use that same button to sign in.',
    ],
    faqs: [
      { q: 'I didn’t get the reset email — what now?', a: 'Check spam, confirm the email is the one you signed up with, and request it again after a minute.' },
      { q: 'It says my account doesn’t exist.', a: 'You may be using a different email or sign-in method than you registered with. Try the others, or contact support.' },
    ],
    related: ['notification-problems', 'account-deletion', 'updating-profile'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ts-notifications',
    slug: 'notification-problems',
    title: 'Notification problems',
    category: 'troubleshooting',
    tags: ['no notifications', 'push not working', 'not receiving', 'alerts off'],
    summary: 'What to check when notifications aren’t coming through.',
    overview:
      'Push notifications need to be allowed in two places: inside NutriSync and in your device’s system settings. If you’re not getting cheers, challenge alerts, or reminders, one of those is usually turned off.',
    steps: [
      'Open Settings → Notifications in NutriSync and enable the types you want.',
      'Enable push notifications when prompted.',
      'Check your device’s system settings and allow notifications for NutriSync.',
      'Reopen the app so it can register for push.',
    ],
    tips: [
      'If you previously declined the permission, you may need to enable it from your device’s system settings.',
      'Battery-saver or focus modes can silence notifications — check those too.',
    ],
    faqs: [
      { q: 'I enabled everything but still get nothing.', a: 'Confirm notifications are allowed for NutriSync in your device settings, disable any focus/battery-saver mode, then reopen the app.' },
      { q: 'Do notifications work in the background?', a: 'Yes, once push is enabled in both the app and your device. Reopening the app once helps it register.' },
    ],
    related: ['notification-settings', 'login-problems', 'encouraging-members'],
    lastUpdated: UPDATED, version: V,
  },
]
