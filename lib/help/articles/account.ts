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
    title: 'Subscription plans',
    category: 'account',
    tags: ['subscription', 'premium', 'plan', 'upgrade', 'coach plan', 'pricing'],
    summary: 'What’s included free and what a paid plan adds.',
    overview:
      'Core tracking — logging, dashboard, groups, challenges, and trends — is free. A paid plan adds advanced coaching features for people who run accountability groups as coaches. You can review plans and manage yours in Settings.',
    steps: [
      'Go to Settings → Subscription.',
      'Review what each plan includes.',
      'Choose a plan to upgrade, or manage your current one.',
      'Confirm through your app store or payment provider.',
    ],
    tips: [
      'You don’t need a paid plan to log, join groups, or run challenges.',
      'Coach features are designed for people supporting a roster of clients.',
    ],
    faqs: [
      { q: 'What do I get for free?', a: 'Food logging, activity and water tracking, your dashboard, groups, challenges, streaks, and trends.' },
      { q: 'How am I billed?', a: 'Through your app store or payment provider, on the cycle shown when you subscribe.' },
    ],
    related: ['canceling-subscription', 'refund-requests', 'updating-profile'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ac-cancel',
    slug: 'canceling-subscription',
    title: 'Canceling your subscription',
    category: 'account',
    tags: ['cancel', 'unsubscribe', 'stop billing', 'end subscription', 'restore'],
    summary: 'How to cancel and what happens to your data.',
    overview:
      'You can cancel anytime. Cancellation stops future billing; you keep access to paid features until the end of the period you already paid for. Your logs, groups, and history stay with your account.',
    steps: [
      'Open Settings → Subscription.',
      'Choose Manage or Cancel.',
      'Confirm the cancellation in your app store or payment provider.',
      'You’ll keep paid features until the current period ends.',
    ],
    tips: [
      'Subscriptions are billed through your app store, so the final cancel step happens there.',
      'Switched devices or restored your phone? Use “Restore purchases” in Settings → Subscription to recover an active plan.',
    ],
    faqs: [
      { q: 'Will I lose my data if I cancel?', a: 'No. Your account, logs, and streaks remain. You simply lose access to paid-only features after the period ends.' },
      { q: 'How do I restore purchases?', a: 'In Settings → Subscription, choose Restore purchases to re-link an active subscription on a new device.' },
    ],
    related: ['subscription-plans', 'refund-requests', 'account-deletion'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'ac-refunds',
    slug: 'refund-requests',
    title: 'Refund requests',
    category: 'account',
    tags: ['refund', 'money back', 'charge', 'billing issue'],
    summary: 'How refunds work and where to request one.',
    overview:
      'Because subscriptions are processed by your app store, refunds are handled there under their policies. NutriSync can help point you in the right direction if you were charged unexpectedly.',
    steps: [
      'Find the charge in your app store’s purchase history.',
      'Use the app store’s “Report a problem” or refund request flow.',
      'If you need help, contact NutriSync support with the date and amount.',
    ],
    tips: [
      'Have your purchase date and amount handy to speed things up.',
      'Refund eligibility follows your app store’s rules, not just ours.',
    ],
    faqs: [
      { q: 'Can NutriSync refund me directly?', a: 'Payments go through your app store, so refunds are requested there. We’re happy to help you find the right place.' },
      { q: 'I was charged after canceling — what now?', a: 'Check that the cancellation completed in your app store, then contact support with the details if a charge still went through.' },
    ],
    related: ['canceling-subscription', 'subscription-plans', 'login-problems'],
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
      'Go to Settings → Privacy (or Account).',
      'Choose Delete account.',
      'Read the confirmation carefully — this is permanent.',
      'Confirm to delete your account and data.',
    ],
    tips: [
      'If you just want a break, a private privacy mode lets you step back without deleting anything.',
      'Cancel any active subscription in your app store separately — deleting the account doesn’t cancel app-store billing.',
    ],
    faqs: [
      { q: 'Can I recover my account after deleting?', a: 'No. Deletion is permanent and removes your data.' },
      { q: 'What happens to my group?', a: 'Your own data is removed. If you founded a group, sort out its future before deleting your account.' },
    ],
    related: ['canceling-subscription', 'group-privacy', 'managing-members'],
    lastUpdated: UPDATED, version: V,
  },
]
