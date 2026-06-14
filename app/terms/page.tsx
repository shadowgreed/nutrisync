import LegalPage from '@/components/LegalPage'

export const metadata = { title: 'Terms of Service · NutriSync' }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="June 14, 2026">
      <p>These terms govern your use of NutriSync. By creating an account or using the app, you agree to them. If you don&rsquo;t agree, please don&rsquo;t use NutriSync.</p>

      <h2>Eligibility</h2>
      <p>You must be at least 16 years old and able to form a binding agreement to use NutriSync.</p>

      <h2>The service</h2>
      <p>NutriSync lets you log meals, water, activity, and weight, see nutrition estimates and trends, and share progress with a private group. Features may change or be discontinued over time.</p>

      <h2>Not medical or dietary advice</h2>
      <p>NutriSync is a wellness tool. Nutrition values — especially those estimated from photos or names by AI — are approximate and may be inaccurate. Calorie targets are general estimates. Nothing in the app is medical, nutritional, or professional advice. Consult a qualified professional before making health decisions, and never disregard professional advice because of something in the app.</p>

      <h2>Your content</h2>
      <p>You own the meals, photos, captions, and comments you create. By posting to a group, you grant us a limited license to store and display that content to you and your group members so the app can function. Don&rsquo;t post content that is unlawful, harmful, infringing, or that isn&rsquo;t yours to share.</p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Be respectful to other members; no harassment, hate, or abuse.</li>
        <li>Don&rsquo;t attempt to break, overload, scrape, or reverse-engineer the service.</li>
        <li>Don&rsquo;t use the app to violate any law or another person&rsquo;s rights.</li>
      </ul>

      <h2>Your account</h2>
      <p>Keep your login credentials secure; you&rsquo;re responsible for activity under your account. You can delete your account at any time from Edit profile &rarr; Help.</p>

      <h2>Third-party data</h2>
      <p>Food and barcode data comes from third-party sources (e.g. USDA FoodData Central, Open Food Facts) and AI estimates. We don&rsquo;t guarantee its accuracy or completeness.</p>

      <h2>Termination</h2>
      <p>You may stop using NutriSync at any time. We may suspend or terminate access if you violate these terms or to protect the service or its users.</p>

      <h2>Disclaimers &amp; limitation of liability</h2>
      <p>NutriSync is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any kind. To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential damages, or for decisions you make based on the app&rsquo;s estimates.</p>

      <h2>Changes</h2>
      <p>We may update these terms; we&rsquo;ll revise the date above. Continued use means you accept the updated terms.</p>

      <h2>Contact</h2>
      <p>Questions about these terms? Email <a href="mailto:hello@nutrisync.app">hello@nutrisync.app</a>.</p>
    </LegalPage>
  )
}
