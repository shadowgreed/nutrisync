import LegalPage from '@/components/LegalPage'
import { getDict } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n/server'

export const metadata = { title: 'Terms of Service · NutriSync' }

export default async function TermsPage() {
  const locale = await getLocale()
  const t = getDict(locale)

  if (locale === 'es') {
    return (
      <LegalPage title={t.legal.termsTitle} updated="14 de junio de 2026">
        <p>Estos términos rigen tu uso de NutriSync. Al crear una cuenta o usar la app, los aceptas. Si no estás de acuerdo, por favor no uses NutriSync.</p>

        <h2>Elegibilidad</h2>
        <p>Debes tener al menos 16 años y poder celebrar un acuerdo vinculante para usar NutriSync.</p>

        <h2>El servicio</h2>
        <p>NutriSync te permite registrar comidas, agua, actividad y peso, ver estimaciones y tendencias de nutrición, y compartir tu progreso con un grupo privado. Las funciones pueden cambiar o descontinuarse con el tiempo.</p>

        <h2>No es asesoría médica ni nutricional</h2>
        <p>NutriSync es una herramienta de bienestar. Los valores nutricionales — especialmente los estimados por IA a partir de fotos o nombres — son aproximados y pueden ser inexactos. Las metas de calorías son estimaciones generales. Nada en la app constituye asesoría médica, nutricional o profesional. Consulta a un profesional calificado antes de tomar decisiones de salud, y nunca ignores el consejo de un profesional por algo que veas en la app.</p>

        <h2>Tu contenido</h2>
        <p>Tú eres el dueño de las comidas, fotos, descripciones y comentarios que creas. Al publicar en un grupo, nos otorgas una licencia limitada para almacenar y mostrar ese contenido a ti y a los miembros de tu grupo para que la app pueda funcionar. No publiques contenido ilegal, dañino, que infrinja derechos de terceros, o que no seas libre de compartir.</p>

        <h2>Uso aceptable</h2>
        <ul>
          <li>Sé respetuoso con los demás miembros; no se permite el acoso, el odio ni el abuso.</li>
          <li>No intentes dañar, sobrecargar, extraer datos (scraping) ni realizar ingeniería inversa del servicio.</li>
          <li>No uses la app para violar ninguna ley o los derechos de otra persona.</li>
        </ul>

        <h2>Tu cuenta</h2>
        <p>Mantén tus credenciales de acceso seguras; eres responsable de la actividad realizada bajo tu cuenta. Puedes eliminar tu cuenta en cualquier momento desde <strong>Configuración → Privacidad → Eliminar cuenta</strong>, y descargar tus datos desde <strong>Configuración → Privacidad → Exportar mis datos</strong>.</p>

        <h2>Datos de terceros</h2>
        <p>Los datos de alimentos y códigos de barras provienen de fuentes de terceros (por ejemplo, USDA FoodData Central, Open Food Facts) y de estimaciones de IA. No garantizamos su exactitud ni integridad.</p>

        <h2>Terminación</h2>
        <p>Puedes dejar de usar NutriSync en cualquier momento. Podemos suspender o cancelar tu acceso si incumples estos términos, o para proteger el servicio o a sus usuarios.</p>

        <h2>Renuncias y limitación de responsabilidad</h2>
        <p>NutriSync se ofrece &ldquo;tal cual&rdquo; y &ldquo;según disponibilidad&rdquo;, sin garantías de ningún tipo. En la mayor medida permitida por la ley, no somos responsables por daños indirectos, incidentales o consecuentes, ni por decisiones que tomes basándote en las estimaciones de la app.</p>

        <h2>Cambios</h2>
        <p>Podemos actualizar estos términos; en ese caso actualizaremos la fecha indicada arriba. Si continúas usando la app, aceptas los términos actualizados.</p>

        <h2>Contacto</h2>
        <p>¿Preguntas sobre estos términos? Escríbenos a <a href="mailto:hello@nutrisync.app">hello@nutrisync.app</a>.</p>
      </LegalPage>
    )
  }

  return (
    <LegalPage title={t.legal.termsTitle} updated="June 14, 2026">
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
      <p>Keep your login credentials secure; you&rsquo;re responsible for activity under your account. You can delete your account at any time from <strong>Settings &rarr; Privacy &rarr; Delete account</strong>, and download your data from <strong>Settings &rarr; Privacy &rarr; Export my data</strong>.</p>

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
