import LegalPage from '@/components/LegalPage'

export const metadata = { title: 'Privacy Policy · NutriSync' }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="June 14, 2026">
      <p>NutriSync (&ldquo;we,&rdquo; &ldquo;us&rdquo;) helps you track nutrition and stay accountable with a small group. This policy explains what we collect, why, and your choices. By using NutriSync you agree to this policy.</p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account:</strong> your email address and an encrypted password (managed by our auth provider).</li>
        <li><strong>Profile:</strong> display name, optional profile photo, and details you choose to add — birth year, biological sex, height, weight, goal weight, activity level, and goals.</li>
        <li><strong>Logs:</strong> meals (including any photos and captions you add), water, activity, and weight entries.</li>
        <li><strong>Social:</strong> the group(s) you join, and reactions, comments, and cheers you send or receive.</li>
        <li><strong>Notifications:</strong> a web-push subscription token if you enable notifications.</li>
        <li><strong>Technical:</strong> standard logs and device/usage data needed to operate and secure the app.</li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To provide the core features: logging, calorie and nutrient targets, trends, reminders, and the group feed.</li>
        <li>To estimate the nutrition of foods you log (see &ldquo;AI processing&rdquo; below).</li>
        <li>To show the people in your group the posts and activity you choose to share.</li>
        <li>To send notifications you&rsquo;ve enabled (reminders, reactions, replies, weekly reports).</li>
        <li>To keep the service secure and fix problems.</li>
      </ul>

      <h2>AI processing</h2>
      <p>When you log a meal by photo or by name, that food text or image is sent to our AI provider (Anthropic) to estimate calories, macros, and micronutrients. These estimates are approximate and are not used by us to train AI models.</p>

      <h2>Service providers</h2>
      <p>We share data only as needed with vendors that run the app on our behalf:</p>
      <ul>
        <li><strong>Supabase</strong> — database, file storage, authentication.</li>
        <li><strong>Anthropic</strong> — AI food and photo analysis.</li>
        <li><strong>Vercel</strong> — application hosting.</li>
        <li><strong>USDA FoodData Central</strong> and <strong>Open Food Facts</strong> — food and barcode reference data.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>What others can see</h2>
      <p>Members of your group can see the meals and activities you choose to share to the feed, your display name and photo, and a small profile summary (goals and progress). Meal and profile photos are stored with public links so they can load in the feed — treat anything you upload as potentially viewable by anyone with the link.</p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>Edit or remove your logs, profile details, and photos at any time.</li>
        <li>Turn notifications on or off in the app.</li>
        <li><strong>Delete your account</strong> from Edit profile &rarr; Help. This permanently removes your profile, logs, photos, and group memberships.</li>
      </ul>

      <h2>Data retention</h2>
      <p>We keep your data while your account is active. When you delete your account, your data is removed promptly; routine backups age out on a rolling basis.</p>

      <h2>Children</h2>
      <p>NutriSync is not intended for anyone under 16. We do not knowingly collect data from children.</p>

      <h2>Security</h2>
      <p>We protect data with row-level access controls and provider-managed encryption. No method of storage or transmission is 100% secure, so we cannot guarantee absolute security.</p>

      <h2>Not medical advice</h2>
      <p>NutriSync provides estimates and general information for wellness, not medical or dietary advice. Always consult a qualified professional about your health.</p>

      <h2>Changes</h2>
      <p>We may update this policy; we&rsquo;ll revise the date above when we do. Continued use means you accept the changes.</p>

      <h2>Contact</h2>
      <p>Questions? Email <a href="mailto:hello@nutrisync.app">hello@nutrisync.app</a>.</p>
    </LegalPage>
  )
}
