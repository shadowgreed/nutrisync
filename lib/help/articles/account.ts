import type { Article } from '../types'

const UPDATED = '2026-06-21'
const V = '1.0'

export const account: Article[] = [
  {
    id: 'ac-profile',
    slug: 'updating-profile',
    title: 'Updating your profile',
    category: 'account',
    tags: ['profile', 'edit profile', 'name', 'photo', 'weight', 'height'],
    summary: 'Change your name, photo, body stats, activity level, or goal.',
    overview:
      'Your profile holds the details that personalize NutriSync — your display name and photo, plus the body stats, activity level, and goal that set your calorie and nutrient targets. Keep them current so your numbers stay accurate.',
    steps: [
      'Go to Profile → Edit.',
      'Update your name, photo, height, weight, activity level, or goal.',
      'Save. Targets that depend on these values update right away.',
    ],
    tips: [
      'Update your weight as it changes so your calorie target keeps pace.',
      'Your display name and photo are what your group sees in the feed.',
    ],
    faqs: [
      { q: 'Will changing my stats reset my history?', a: 'No. Your logs and streaks stay; only your forward-looking targets adjust.' },
      { q: 'Is my personal info private?', a: 'Yes. Your stats are used to calculate your targets and aren’t shared with your group.' },
    ],
    related: ['setting-goals', 'understanding-calorie-targets', 'notification-settings'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ac-notifications',
    slug: 'notification-settings',
    title: 'Notification settings',
    category: 'account',
    tags: ['notifications', 'push', 'alerts', 'reminders', 'turn off'],
    summary: 'Choose which notifications you receive and how.',
    overview:
      'Notifications keep you in the loop — cheers from your group, challenge milestones, reminders, and weekly recaps. You control which ones you get and can turn off any you don’t want.',
    steps: [
      'Go to Settings → Notifications.',
      'Turn individual notification types on or off.',
      'Enable push notifications if you want alerts on your device.',
      'Save your preferences.',
    ],
    tips: [
      'Keep cheers and challenge alerts on — they’re part of what keeps groups active.',
      'If you’re not getting push notifications, see Notification problems in Troubleshooting.',
    ],
    faqs: [
      { q: 'Why didn’t I get a notification?', a: 'Push must be enabled both in NutriSync and in your device settings. See Notification problems.' },
      { q: 'Can I mute a group?', a: 'Use the notification settings to reduce alerts. You’ll still see updates in the feed when you open the app.' },
    ],
    related: ['notification-problems', 'updating-profile', 'group-privacy'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ac-plans',
    slug: 'subscription-plans',
    title: 'Is NutriSync free?',
    category: 'account',
    tags: ['free', 'price', 'cost', 'plan', 'subscription', 'pricing'],
    summary: 'NutriSync is free — every feature is included at no cost.',
    overview:
      'NutriSync is free to use, and there are no in-app purchases. Food logging, activity, hydration, your dashboard, groups, challenges, trends, and weekly reviews are all included at no cost.',
    steps: [
      'Create an account and start logging — nothing to buy.',
      'See your plan anytime under Settings → Current plan.',
    ],
    tips: [
      'There’s no paywall — every screen and feature is available to everyone.',
      'If paid features are ever added, you’ll be clearly told the price and terms before anything is charged.',
    ],
    faqs: [
      { q: 'Do I have to pay for anything?', a: 'No. NutriSync is currently free and has no in-app purchases.' },
      { q: 'Will it always be free?', a: 'Core tracking is free today. If that ever changes, we’ll show pricing and terms up front — you’ll never be charged without opting in.' },
    ],
    related: ['updating-profile', 'account-deletion', 'notification-settings'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ac-leaving',
    slug: 'leaving-nutrisync',
    title: 'Leaving NutriSync',
    category: 'account',
    tags: ['cancel', 'stop', 'leave', 'quit', 'take a break'],
    summary: 'There’s nothing to cancel — how to step away or delete your account.',
    overview:
      'NutriSync is free with no subscription, so there’s nothing to cancel. If you want to step back, you can switch to a private mode or simply stop logging — and if you want to leave for good, you can permanently delete your account.',
    steps: [
      'For a break: Settings → Privacy → set your profile to Private.',
      'To leave a group: open the group and choose Leave group.',
      'To delete everything: Settings → Privacy → Delete account.',
    ],
    tips: [
      'Switching to Private keeps your data and streak but hides you from your group.',
      'Deleting your account is permanent and removes all your data.',
    ],
    faqs: [
      { q: 'Is there a subscription to cancel?', a: 'No. NutriSync is free with no in-app purchases, so there’s nothing to cancel or unsubscribe from.' },
      { q: 'Can I just take a break?', a: 'Yes — set your profile to Private in Settings → Privacy, or just stop logging. Your account stays until you delete it.' },
    ],
    related: ['account-deletion', 'group-privacy', 'subscription-plans'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ac-delete',
    slug: 'account-deletion',
    title: 'Account deletion',
    category: 'account',
    tags: ['delete account', 'remove account', 'erase data', 'close account'],
    summary: 'How to permanently delete your account and data.',
    overview:
      'You can permanently delete your account. This removes your profile, logs, and history and can’t be undone. If you’re a group founder, consider handing off or winding down your group first.',
    steps: [
      'Go to Settings → Privacy → Delete account.',
      'Read the confirmation carefully — this is permanent.',
      'Confirm to delete your account and all your data.',
    ],
    tips: [
      'If you just want a break, a private privacy mode lets you step back without deleting anything.',
      'You can also download a copy of your data first — Settings → Privacy → Export my data.',
    ],
    faqs: [
      { q: 'Can I recover my account after deleting?', a: 'No. Deletion is permanent and removes your data.' },
      { q: 'What happens to my group?', a: 'Your own data is removed. If you founded a group, sort out its future before deleting your account.' },
    ],
    related: ['leaving-nutrisync', 'group-privacy', 'managing-members'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ac-export',
    slug: 'export-your-data',
    title: 'Exporting your data',
    category: 'account',
    tags: ['export', 'download data', 'backup', 'gdpr', 'my data'],
    summary: 'Download a copy of everything you’ve logged.',
    overview:
      'You can download all of your own data — profile, meals, activity, water, weight, reactions, comments, group memberships, challenges you created, and milestones — as a single JSON file, anytime.',
    steps: [
      'Go to Settings → Privacy.',
      'Under Data, tap Export my data.',
      'A JSON file downloads to your device.',
    ],
    tips: [
      'The export is a snapshot at the moment you download it — run it again anytime for an up-to-date copy.',
      'It’s a good idea to export before deleting your account if you want to keep your history.',
    ],
    faqs: [
      { q: 'What format is the export?', a: 'A single JSON file containing your data — readable by you and importable into other tools.' },
      { q: 'Does it include other people’s data?', a: 'No. The export contains only your own data.' },
    ],
    related: ['account-deletion', 'group-privacy', 'updating-profile'],
    lastUpdated: UPDATED, version: V,
  },
]
