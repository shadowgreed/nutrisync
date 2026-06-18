// Generates the NutriSync product + monetization brief as a PDF (pdfkit, no network).
const PDFDocument = require('pdfkit')
const fs = require('fs')

const OUT = '/home/user/nutrisync/NutriSync-Product-Overview.pdf'
const EMERALD = '#059669'
const DARK = '#1c1917'
const GRAY = '#57534e'
const LIGHT = '#78716c'

const doc = new PDFDocument({ size: 'A4', margins: { top: 64, bottom: 64, left: 64, right: 64 }, bufferPages: true })
doc.pipe(fs.createWriteStream(OUT))

const W = doc.page.width - 128 // content width

function h1(t) {
  doc.moveDown(0.8)
  doc.fillColor(EMERALD).font('Helvetica-Bold').fontSize(16).text(t)
  doc.moveTo(64, doc.y + 2).lineTo(64 + W, doc.y + 2).strokeColor('#d6d3d1').lineWidth(1).stroke()
  doc.moveDown(0.5)
}
function h2(t) {
  doc.moveDown(0.4)
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11.5).text(t)
  doc.moveDown(0.15)
}
function para(t) {
  doc.fillColor(GRAY).font('Helvetica').fontSize(10).text(t, { align: 'left', lineGap: 2 })
  doc.moveDown(0.35)
}
function bullets(items) {
  doc.fillColor(GRAY).font('Helvetica').fontSize(10)
  doc.list(items, { bulletRadius: 1.6, textIndent: 12, bulletIndent: 2, lineGap: 2, paragraphGap: 3 })
  doc.moveDown(0.3)
}
function lead(label, rest) {
  doc.font('Helvetica-Bold').fillColor(DARK).fontSize(10).text(label, { continued: true })
  doc.font('Helvetica').fillColor(GRAY).text(rest, { lineGap: 2 })
  doc.moveDown(0.3)
}

// ── Cover ────────────────────────────────────────────────────────────────────
doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0a0a0a')
doc.fillColor('#34d399').font('Helvetica-Bold').fontSize(13).text('NUTRISYNC', 64, 150, { characterSpacing: 3 })
doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(30).text('Product Overview &', 64, 200, { lineGap: 4 })
doc.text('Monetization Brief')
doc.fillColor('#a8a29e').font('Helvetica').fontSize(12).text('Eat well, together — an AI-assisted, coach-led nutrition platform', 64, 300, { width: W })
doc.fillColor('#57534e').font('Helvetica').fontSize(9.5)
doc.text('Prepared for monetization strategy review', 64, 720)
doc.text('Confidential · ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))

doc.addPage()

// ── Executive summary ──────────────────────────────────────────────────────────
h1('1 · Executive Summary')
para('NutriSync is a mobile-first nutrition tracker built around a behavior the rest of the category ignores: accountability. Most trackers are lonely spreadsheets that users abandon within weeks. NutriSync makes logging effortless (snap a photo, AI does the rest) and progress social (a small private group, carried by a real human coach), then amplifies that coach with AI so one person can support many clients.')
para('The product pairs the two things proven to drive retention — fast, low-friction logging and human accountability — and adds a defensible wedge the incumbents lack: a coach dashboard with an AI "Copilot" that drafts personalized client check-ins (the coach edits and sends; the AI never messages a client on its own).')
lead('The opportunity in one line:  ', 'a consumer nutrition app whose stickiness comes from a human coach, with the monetization scaffolding (plans, seat caps, gated AI) already built in for a coach-pays, B2B2C model.')

// ── What it is ──────────────────────────────────────────────────────────────
h1('2 · What NutriSync Is')
para('A web app / installable PWA where a user logs meals, hydration, activity, and weight, and sees their nutrition come together — calories, macros, and ten key micronutrients. What makes it different is the social layer: users belong to a small private group (friends, family, or a coach’s clients) and see each other’s progress in a supportive feed.')
para('A group can be led by a coach — a personal trainer, nutritionist, or simply the fit friend who already informally coaches their circle. The coach gets a dashboard over their members and an AI Copilot that turns the grunt work of client check-ins into a five-minute daily review.')

// ── Core features ────────────────────────────────────────────────────────────
h1('3 · Core Capabilities')
h2('Effortless logging')
bullets([
  'AI photo logging — snap a meal; Claude Vision identifies each food and returns calories, macros, and micronutrients in one step.',
  'Barcode scanning (Open Food Facts) and USDA food search, with AI estimation fallback.',
  'Activity, hydration (water), and weight logging.',
])
h2('Nutrition intelligence')
bullets([
  'Macros plus 10 tracked micronutrients with color-coded daily gaps.',
  '"Close my gaps" — suggests specific whole foods to fix the biggest nutrient shortfalls.',
  'Diet-aware: vegan, keto, carnivore, etc. — the app acknowledges nutrients a diet naturally runs low on instead of falsely flagging them.',
])
h2('Social accountability')
bullets([
  'Small private groups with a live feed of meals, workouts, and milestone celebrations.',
  'Reactions, threaded comments, double-tap-to-like, and "cheers" encouragement.',
  'Push + in-app notifications that deep-link to the exact post.',
])
h2('Insight')
bullets([
  'Trends: 7 / 14 / 30-day calorie balance (in / burned / net), hydration, macros, micronutrient consistency, and weight with goal-milestone tracking.',
  'A weekly story-style recap (calories, nutrients, activity, hydration) delivered by push.',
])

// ── The differentiator ─────────────────────────────────────────────────────────
h1('4 · The Differentiator — Coach + AI Copilot')
para('This is the strategic core. Industry data is consistent: a human coach wins on the thing that actually retains clients (relationship, timing, judgment), while AI is the force multiplier that lets one coach carry many more clients. NutriSync builds exactly that division of labor.')
bullets([
  'Coach dashboard — a roster of clients triaged by who needs attention, with per-client drill-down (week stats, flagged signals, private notes).',
  'AI Copilot — drafts a personalized, on-brand check-in from each client’s logged data. The hard rule, enforced in the architecture: the Copilot drafts; the coach edits and sends. AI never messages a client on its own.',
  'Daily digest — a scheduled job pre-builds drafts and nudges the coach ("5 clients need a check-in"), turning the tool into a daily habit.',
  'Coaching voice — the coach sets a tone the AI matches, so drafts sound like them.',
])
lead('Why it is defensible:  ', 'consumer apps (Cal AI, MyFitnessPal) have no human-coach layer; coaching platforms (Trainerize, TrueCoach) feel like clinical CRM software and lack the light, social, fun logging. NutriSync owns the gap: a coach and their crew, in a feed that feels like a social app, not a spreadsheet.')

// ── Technology ─────────────────────────────────────────────────────────────────
h1('5 · Technology')
bullets([
  'Next.js 16 (App Router, React 19), TypeScript, Tailwind CSS — installable PWA with web-push notifications.',
  'Supabase — Postgres with row-level security, realtime feed, file storage, and auth.',
  'Anthropic Claude — vision (photo → nutrition) and the coaching Copilot drafting layer.',
  'Deployed on Vercel with preview-per-PR. Clean, type-checked codebase; security enforced at the database via RLS.',
])

// ── Strengths ──────────────────────────────────────────────────────────────────
h1('6 · Strengths')
bullets([
  'Retention by design — the social group + human coach attack the #1 reason trackers fail (people quit alone). Reported transformations correlate strongly with in-app social connectivity.',
  'Lowest-friction logging — AI photo capture matches the single most-loved feature in the category.',
  'Nutrient depth — micronutrient tracking rivals Cronometer but in a friendlier, modern UI.',
  'A built-in B2B2C wedge — the coach is the paying customer; members join free, creating a network/acquisition loop with far better economics than typical 2–5% consumer freemium conversion.',
  'Gentle, privacy-first brand — non-guilt framing and strict per-user privacy controls, a deliberate contrast to the category’s shame-driven streak mechanics and recent data-trust scandals.',
])

// ── Market & potential ─────────────────────────────────────────────────────────
h1('7 · Market & Potential')
para('The nutrition/fitness app market is large but crowded at the consumer-tracker end, where subscription fatigue is high. The fastest-growing, least-saturated segments are community/accountability and AI-assisted coaching — the AI personal-training market alone is projected to grow from roughly $16.9B (2025) toward $35B by 2030, and a majority of trainers already use AI tools.')
para('NutriSync is positioned at that intersection. Adjacent tailwinds it can ride: the GLP-1 wave (medication users need protein/muscle-preservation tracking and accountability), the creator-coach economy (fit influencers monetizing their following), and the migration of users frustrated with cluttered incumbents.')

// ── Monetization levers ─────────────────────────────────────────────────────────
h1('8 · Monetization Levers Already Built In')
para('The codebase ships with the plumbing for several revenue models — the firm can choose and price; the hooks exist:')
bullets([
  'Group plans — every group has a plan (free vs coach) and a member cap (free 6, coach 30+). Upgrading is a single database flag; a single gating helper is the one place to wire Stripe.',
  'Gated AI — Copilot drafting is rate-limited per coach and per client, an obvious premium lever (higher limits / more clients on paid tiers).',
  'Coach-pays (B2B2C) — coaches pay for the dashboard, Copilot, and larger rosters; members stay free. The highest-LTV path and the recommended primary route.',
])
h2('Candidate routes for the firm to evaluate')
bullets([
  'Coach / creator subscription (primary) — per-seat or per-roster pricing for trainers, nutritionists, and influencer-coaches.',
  'Consumer freemium — premium tier for higher AI limits, larger friend groups, and advanced analytics.',
  'GLP-1 companion add-on — medication + muscle-preservation tracking for a fast-growing, underserved, willing-to-pay cohort.',
  'Marketplace / programs — coaches sell meal or training programs in-app (transaction take-rate).',
  'Integrations tier — wearable (Apple Watch / Garmin) and device sync as a paid upgrade.',
])

// ── Current state ────────────────────────────────────────────────────────────
h1('9 · Current State & Near-Term Roadmap')
lead('Built and shipped:  ', 'full logging (AI photo, barcode, search), micronutrient tracking, social groups + feed, comment likes, notifications with deep-links, water tracking, weekly report, Trends analytics, member diets, and the complete Coach + AI Copilot system (dashboard, drafting, daily digest, plan/seat scaffolding).')
lead('Ready to switch on:  ', 'billing (Stripe) at the single gating hook; the plan/cap model and AI limits are already in place.')
lead('Natural next steps:  ', 'native iOS/Android apps and wearable integrations; capturing diet at onboarding; a GLP-1 mode. None are blockers to a paid pilot with coaches today.')

para(' ')
doc.moveDown(0.5)
doc.fillColor(LIGHT).font('Helvetica-Oblique').fontSize(9).text('NutriSync is a feature-complete MVP with a differentiated, defensible model and the monetization scaffolding already in place. The core question for the firm is not "can it make money" but "which of several ready-made routes to prioritize first."', { width: W, lineGap: 2 })

// ── Footer page numbers ────────────────────────────────────────────────────────
const range = doc.bufferedPageRange()
for (let i = 1; i < range.count; i++) { // skip cover
  doc.switchToPage(i)
  doc.fillColor(LIGHT).font('Helvetica').fontSize(8)
  doc.text('NutriSync — Confidential', 64, doc.page.height - 40, { width: W / 2, align: 'left', lineBreak: false })
  doc.text(`${i + 1}`, 64, doc.page.height - 40, { width: W, align: 'right', lineBreak: false })
}

doc.end()
console.log('Wrote', OUT)
