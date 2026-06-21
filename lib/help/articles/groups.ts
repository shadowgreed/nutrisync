import type { Article } from '../types'

const UPDATED = '2026-06-21'
const V = '1.0'

export const groups: Article[] = [
  {
    id: 'gr-create',
    slug: 'creating-a-group',
    title: 'Creating a group',
    category: 'groups',
    tags: ['create group', 'new group', 'start group', 'accountability'],
    summary: 'Start a private group and become its founder.',
    overview:
      'A group is your private accountability crew. When you create one you become its founder, which lets you manage members and the group’s settings. Everyone in the group shares a feed and can join the same challenges.',
    steps: [
      'Go to the Feed or Groups area and choose Create group.',
      'Give your group a name.',
      'Create it — you’ll get an invite code to share.',
      'Send the code or link to the people you want to join.',
    ],
    tips: [
      'Smaller, tighter groups tend to be more active than large ones.',
      'Name the group around its purpose — “Summer cut” or “Morning walkers” — to set the tone.',
    ],
    faqs: [
      { q: 'Can I be in more than one group?', a: 'Yes. Your feed brings together the groups you belong to.' },
      { q: 'Who can see my group?', a: 'Only people who join with the invite code. Groups are private.' },
    ],
    related: ['inviting-friends', 'managing-members', 'group-privacy'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'gr-invite',
    slug: 'inviting-friends',
    title: 'Inviting friends',
    category: 'groups',
    tags: ['invite', 'join code', 'add friends', 'share', 'invite link'],
    summary: 'Share your group’s invite code so friends can join.',
    overview:
      'People join your group with an invite code or link. Share it however you like — text, chat, or in person. New members appear in the group once they join.',
    steps: [
      'Open your group.',
      'Find the invite code or Share option.',
      'Send the code or link to your friends.',
      'They open NutriSync, choose Join group, and enter the code.',
    ],
    tips: [
      'If your group has a member limit, invite the people most likely to stay active first.',
      'New members can start logging and join challenges right away.',
    ],
    faqs: [
      { q: 'What if my friend doesn’t have the app?', a: 'They’ll need to create an account first, then join with the code.' },
      { q: 'Can someone join without a code?', a: 'No. The invite code keeps your group private.' },
    ],
    related: ['creating-a-group', 'managing-members', 'group-feed-overview'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'gr-manage',
    slug: 'managing-members',
    title: 'Managing members',
    category: 'groups',
    tags: ['remove member', 'manage', 'kick', 'members', 'founder', 'admin'],
    summary: 'How founders manage who’s in the group.',
    overview:
      'As the group founder you can see your members and remove anyone who shouldn’t be there. Removing a member takes them out of the group feed and challenges. This action is limited to the founder.',
    steps: [
      'Open your group and tap a member to open their profile.',
      'If you’re the founder, choose Remove from group.',
      'Confirm. They lose access to that group’s feed.',
    ],
    tips: [
      'Removing a member doesn’t delete their account or their own data — it just removes them from your group.',
      'The founder can’t remove themselves; to step away, leave the group instead.',
    ],
    faqs: [
      { q: 'Can regular members remove people?', a: 'No. Only the founder can remove members.' },
      { q: 'Will the person be notified?', a: 'They simply lose access to the group. Removal is meant to be quiet and respectful.' },
    ],
    related: ['creating-a-group', 'group-privacy', 'encouraging-members'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'gr-encourage',
    slug: 'encouraging-members',
    title: 'Encouraging members',
    category: 'groups',
    tags: ['cheer', 'encourage', 'react', 'support', 'nudge'],
    summary: 'Send cheers and reactions to keep your crew motivated.',
    overview:
      'Accountability works because people notice. Send a one-tap cheer or reaction to celebrate a streak, congratulate a workout, or nudge someone who hasn’t logged today. It takes a second and means a lot.',
    steps: [
      'Open a member’s profile, or a post in the group feed.',
      'Tap a quick reaction — for example 👏 Nice job, 🔥 Keep going, or 💪 You’ve got this.',
      'They get a notification right away. No typing required.',
    ],
    tips: [
      'A nudge to someone who hasn’t logged today is often the difference between a broken and an unbroken streak.',
      'Reacting to meals and workouts in the feed keeps the whole group engaged.',
    ],
    faqs: [
      { q: 'Do cheers send a notification?', a: 'Yes — the person you cheer gets an in-app notification and a push if they have them enabled.' },
      { q: 'Is there a limit?', a: 'There’s a generous hourly limit to keep cheers feeling special rather than spammy.' },
    ],
    related: ['group-feed-overview', 'managing-members', 'streak-tracking'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'gr-feed',
    slug: 'group-feed-overview',
    title: 'Group feed overview',
    category: 'groups',
    tags: ['feed', 'group feed', 'posts', 'activity', 'comments'],
    summary: 'What shows up in the feed and how to interact with it.',
    overview:
      'The feed is where your group’s logging shows up — meals, workouts, milestones, and challenge moments. You can react, comment, and cheer. It’s the heartbeat of an active group.',
    steps: [
      'Open the Feed tab.',
      'Scroll recent meals, activities, and milestones from your group.',
      'React or comment on a post.',
      'Tap someone’s name to view their profile and progress.',
    ],
    tips: [
      'Milestone cards (like hitting a streak) post automatically to celebrate wins.',
      'What you share to the feed is controlled by your privacy mode.',
    ],
    faqs: [
      { q: 'Why don’t I see anyone’s posts?', a: 'You may not be in a group yet, or members may be on a private privacy mode. Join or create a group to get started.' },
      { q: 'Can I hide a meal from the feed?', a: 'Yes — your privacy mode and per-meal settings control what’s shared. See Group privacy.' },
    ],
    related: ['group-privacy', 'encouraging-members', 'creating-a-group'],
    lastUpdated: UPDATED, version: V,
  },
  {
    id: 'gr-privacy',
    slug: 'group-privacy',
    title: 'Group privacy',
    category: 'groups',
    tags: ['privacy', 'hide', 'visibility', 'private', 'what others see'],
    summary: 'Control exactly what your group can see.',
    overview:
      'You decide how much your group sees. Privacy modes range from sharing full details, to sharing just a summary, to sharing only meal photos, to a private mode that hides your activity from the feed entirely. Your personal numbers are never shared beyond what you choose.',
    steps: [
      'Go to Settings → Privacy.',
      'Choose your privacy mode for the group feed.',
      'Optionally adjust what’s visible to a coach if your group has one.',
      'Save. The change applies across your group activity.',
    ],
    tips: [
      'Use a private mode when you want to keep logging without sharing for a while — your streak still counts.',
      'Even when you share, sensitive details like your exact weight aren’t exposed to other members.',
    ],
    faqs: [
      { q: 'Can members see my weight?', a: 'No. Other members never see your absolute weight — at most a privacy-safe progress indication if you choose to share it.' },
      { q: 'What does the private mode do?', a: 'It keeps your logging to yourself and out of the group feed, while you still get all your own tracking and streaks.' },
    ],
    related: ['group-feed-overview', 'managing-members', 'notification-settings'],
    lastUpdated: UPDATED, version: V,
  },
]
