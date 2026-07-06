import LegalPage from '@/components/LegalPage'
import { getDict } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n/server'

export const metadata = { title: 'About NutriSync' }

export default async function AboutPage() {
  const locale = await getLocale()
  const t = getDict(locale)

  if (locale === 'es') {
    return (
      <LegalPage title={t.legal.aboutTitle}>
        <p className="text-stone-200 text-base">🌿 Come bien, en equipo.</p>

        <p>NutriSync es un registro de nutrición creado para las personas que quieren comer más saludable, alcanzar sus metas y realmente mantener el hábito — con un poco de ayuda de su equipo.</p>

        <h2>Qué hace</h2>
        <ul>
          <li>Toma una foto de tu comida y obtén al instante las calorías, macronutrientes y micronutrientes.</li>
          <li>Consulta un presupuesto diario simple, tu hidratación, tendencias de peso y las vitaminas que te faltan.</li>
          <li>Comparte comidas y entrenamientos con un grupo privado, anímense entre ustedes y reciban un resumen semanal.</li>
        </ul>

        <h2>Por qué lo creamos</h2>
        <p>La mayoría de los registros se sienten como hojas de cálculo que llenas tú solo — por eso la gente abandona. NutriSync hace que registrar sea rápido y que el progreso sea social. La motivación en conjunto con amigos es lo que convierte un &ldquo;debería comer mejor&rdquo; en un hábito duradero.</p>

        <h2>Escríbenos</h2>
        <p>¿Tienes comentarios o quieres asociarte con nosotros? Escríbenos a <a href="mailto:hello@nutrisync.app">hello@nutrisync.app</a>.</p>
      </LegalPage>
    )
  }

  return (
    <LegalPage title={t.legal.aboutTitle}>
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
