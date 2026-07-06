import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'
import { getDict } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = getDict(await getLocale())
  return { title: `${t.legal.privacyTitle} · NutriSync` }
}

export default async function PrivacyPage() {
  const locale = await getLocale()
  const t = getDict(locale)

  if (locale === 'es') {
    return (
      <LegalPage title={t.legal.privacyTitle} updated="14 de junio de 2026">
        <p>NutriSync (&ldquo;nosotros&rdquo;) te ayuda a registrar tu nutrición y a mantenerte motivado junto a un grupo pequeño. Esta política explica qué información recopilamos, por qué, y cuáles son tus opciones. Al usar NutriSync, aceptas esta política.</p>

        <h2>Información que recopilamos</h2>
        <ul>
          <li><strong>Cuenta:</strong> tu correo electrónico y una contraseña cifrada (gestionada por nuestro proveedor de autenticación).</li>
          <li><strong>Perfil:</strong> nombre visible, foto de perfil opcional, y los datos que decidas agregar — año de nacimiento, sexo biológico, estatura, peso, peso objetivo, nivel de actividad y metas.</li>
          <li><strong>Registros:</strong> comidas (incluyendo cualquier foto o descripción que agregues), agua, actividad y registros de peso.</li>
          <li><strong>Social:</strong> el o los grupos a los que te unes, y las reacciones, comentarios y ánimos que envías o recibes.</li>
          <li><strong>Notificaciones:</strong> un token de suscripción push si activas las notificaciones.</li>
          <li><strong>Técnica:</strong> registros estándar y datos de uso/dispositivo necesarios para operar y proteger la app.</li>
        </ul>

        <h2>Cómo usamos tu información</h2>
        <ul>
          <li>Para ofrecer las funciones principales: registro, objetivos de calorías y nutrientes, tendencias, recordatorios y el feed del grupo.</li>
          <li>Para estimar la información nutricional de las comidas que registras (ver &ldquo;Procesamiento con IA&rdquo; abajo).</li>
          <li>Para mostrarle a tu grupo las publicaciones y la actividad que decidas compartir.</li>
          <li>Para enviarte las notificaciones que has activado (recordatorios, reacciones, respuestas, resúmenes semanales).</li>
          <li>Para mantener el servicio seguro y resolver problemas.</li>
        </ul>

        <h2>Procesamiento con IA</h2>
        <p>Cuando registras una comida por foto o por nombre, ese texto o imagen se envía a nuestro proveedor de IA (Anthropic) para estimar calorías, macronutrientes y micronutrientes. Estas estimaciones son aproximadas y no las usamos para entrenar modelos de IA.</p>

        <h2>Proveedores de servicio</h2>
        <p>Compartimos información únicamente cuando es necesario con proveedores que operan la app en nuestro nombre:</p>
        <ul>
          <li><strong>Supabase</strong> — base de datos, almacenamiento de archivos, autenticación.</li>
          <li><strong>Anthropic</strong> — análisis de alimentos y fotos con IA.</li>
          <li><strong>Vercel</strong> — alojamiento de la aplicación.</li>
          <li><strong>USDA FoodData Central</strong> y <strong>Open Food Facts</strong> — datos de referencia de alimentos y códigos de barras.</li>
        </ul>
        <p>No vendemos tu información personal.</p>

        <h2>Qué pueden ver los demás</h2>
        <p>Los miembros de tu grupo pueden ver las comidas y actividades que decidas compartir en el feed, tu nombre visible y foto, y un breve resumen de tu perfil (metas y progreso). Las fotos de comidas y de perfil se almacenan con enlaces públicos para poder mostrarse en el feed — trata todo lo que subas como potencialmente visible para cualquiera que tenga el enlace.</p>

        <h2>Tus opciones y derechos</h2>
        <ul>
          <li>Edita o elimina tus registros, datos de perfil y fotos en cualquier momento.</li>
          <li>Activa o desactiva las notificaciones desde la app.</li>
          <li><strong>Exporta tus datos:</strong> descarga una copia de todo lo que has registrado como archivo JSON desde <strong>Configuración → Privacidad → Exportar mis datos</strong>.</li>
          <li><strong>Elimina tu cuenta</strong> desde <strong>Configuración → Privacidad → Eliminar cuenta</strong>. Esto elimina permanentemente tu perfil, registros, fotos y membresías de grupo.</li>
        </ul>

        <h2>Retención de datos</h2>
        <p>Conservamos tus datos mientras tu cuenta esté activa. Cuando eliminas tu cuenta, tus datos se eliminan de inmediato; las copias de seguridad de rutina se depuran de forma continua.</p>

        <h2>Menores de edad</h2>
        <p>NutriSync no está dirigida a personas menores de 16 años. No recopilamos datos de menores a sabiendas.</p>

        <h2>Seguridad</h2>
        <p>Protegemos los datos con controles de acceso a nivel de fila y cifrado gestionado por nuestros proveedores. Ningún método de almacenamiento o transmisión es 100% seguro, por lo que no podemos garantizar una seguridad absoluta.</p>

        <h2>No es asesoría médica</h2>
        <p>NutriSync ofrece estimaciones e información general de bienestar, no asesoría médica ni nutricional profesional. Consulta siempre a un profesional calificado sobre tu salud.</p>

        <h2>Cambios</h2>
        <p>Podemos actualizar esta política; cuando lo hagamos, actualizaremos la fecha indicada arriba. Si continúas usando la app, aceptas los cambios.</p>

        <h2>Contacto</h2>
        <p>¿Tienes preguntas? Escríbenos a <a href="mailto:hello@nutrisync.app">hello@nutrisync.app</a>.</p>
      </LegalPage>
    )
  }

  return (
    <LegalPage title={t.legal.privacyTitle} updated="June 14, 2026">
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
        <li><strong>Export your data:</strong> download a copy of everything you&rsquo;ve logged as a JSON file from <strong>Settings &rarr; Privacy &rarr; Export my data</strong>.</li>
        <li><strong>Delete your account</strong> from <strong>Settings &rarr; Privacy &rarr; Delete account</strong>. This permanently removes your profile, logs, photos, and group memberships.</li>
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
