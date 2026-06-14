import LegalPage from '@/components/LegalPage'

export const metadata = { title: 'About NutriSync' }

export default function AboutPage() {
  return (
    <LegalPage title="About NutriSync">
      <p className="text-stone-200 text-base">🌿 Eat well, together.</p>

      <p>NutriSync is a nutrition tracker built for people who want to eat healthier, hit their goals, and actually stick with it — with a little help from their crew.</p>

      <h2>What it does</h2>
      <ul>
        <li>Snap a photo of your meal and get instant calories, macros, and micronutrients.</li>
        <li>See a simple daily budget, hydration, weight trends, and the vitamins you&rsquo;re missing.</li>
        <li>Share meals and workouts with a private group, cheer each other on, and get a weekly recap.</li>
      </ul>

      <h2>Why we built it</h2>
      <p>Most trackers feel like spreadsheets you fill out alone — so people quit. NutriSync makes logging fast and makes progress social. Accountability with friends is what turns &ldquo;I should eat better&rdquo; into a habit that lasts.</p>

      <h2>Say hi</h2>
      <p>Got feedback or want to partner with us? Reach out at <a href="mailto:hello@nutrisync.app">hello@nutrisync.app</a>.</p>
    </LegalPage>
  )
}
