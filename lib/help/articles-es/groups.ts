import type { ArticleTranslation } from '../types'

export const groupsEs: ArticleTranslation[] = [
  {
    id: 'gr-create',
    title: 'Crear un grupo',
    tags: ['crear grupo', 'grupo nuevo', 'grupo privado', 'motivación en equipo'],
    summary: 'Crea un grupo privado y conviértete en su fundador.',
    overview:
      'Un grupo es tu equipo privado para mantenerte motivado y en compromiso. Cuando creas uno, te conviertes en su fundador, lo que te permite administrar a los miembros y la configuración del grupo. Todos los integrantes comparten un feed y pueden unirse a los mismos desafíos.',
    steps: [
      'Ve a la sección Feed o Grupos y elige Crear grupo.',
      'Ponle un nombre a tu grupo.',
      'Créalo: recibirás un código de invitación para compartir.',
      'Envía el código o el enlace a las personas que quieres invitar.',
    ],
    tips: [
      'Los grupos más pequeños y unidos suelen ser más activos que los grandes.',
      'Elige un nombre que refleje el propósito del grupo, como "Reto de verano" o "Caminata matutina", para marcar el tono desde el inicio.',
    ],
    faqs: [
      { q: '¿Puedo estar en más de un grupo?', a: 'Sí. Tu feed reúne todos los grupos a los que perteneces.' },
      { q: '¿Quién puede ver mi grupo?', a: 'Solo las personas que se unan con el código de invitación. Los grupos son privados.' },
    ],
  },
  {
    id: 'gr-invite',
    title: 'Invitar amigos',
    tags: ['invitar amigos', 'código de invitación', 'agregar amigos', 'compartir grupo', 'enlace de invitación'],
    summary: 'Comparte el código de invitación de tu grupo para que tus amigos se unan.',
    overview:
      'Las personas se unen a tu grupo con un código o enlace de invitación. Compártelo como prefieras: por mensaje de texto, chat o en persona. Los nuevos miembros aparecen en el grupo apenas se unen.',
    steps: [
      'Abre tu grupo.',
      'Busca el código de invitación o la opción Compartir.',
      'Envía el código o el enlace a tus amigos.',
      'Ellos abren NutriSync, eligen Unirse a un grupo e ingresan el código.',
    ],
    tips: [
      'Si tu grupo tiene un límite de miembros, invita primero a las personas con más probabilidades de mantenerse activas.',
      'Los nuevos miembros pueden empezar a registrar sus comidas y unirse a desafíos de inmediato.',
    ],
    faqs: [
      { q: '¿Qué pasa si mi amigo no tiene la aplicación?', a: 'Primero deberá crear una cuenta y luego unirse con el código.' },
      { q: '¿Alguien puede unirse sin un código?', a: 'No. El código de invitación mantiene tu grupo privado.' },
    ],
  },
  {
    id: 'gr-manage',
    title: 'Administrar miembros',
    tags: ['eliminar miembro', 'administrar grupo', 'expulsar', 'miembros del grupo', 'fundador', 'administrador'],
    summary: 'Cómo administran los fundadores quién forma parte del grupo.',
    overview:
      'Como fundador del grupo, puedes ver a tus miembros y eliminar a cualquiera que no deba estar ahí. Al eliminar a un miembro, este deja de tener acceso al feed y a los desafíos del grupo. Esta acción está limitada al fundador.',
    steps: [
      'Abre tu grupo y toca a un miembro para ver su perfil.',
      'Si eres el fundador, elige Eliminar del grupo.',
      'Confirma. Esa persona perderá el acceso al feed del grupo.',
    ],
    tips: [
      'Eliminar a un miembro no borra su cuenta ni sus datos: solo lo saca de tu grupo.',
      'El fundador no puede eliminarse a sí mismo; si quiere dejar el grupo, debe salir de él en su lugar.',
    ],
    faqs: [
      { q: '¿Los miembros comunes pueden eliminar a otras personas?', a: 'No. Solo el fundador puede eliminar miembros.' },
      { q: '¿Se le notificará a la persona?', a: 'Simplemente pierde el acceso al grupo. La eliminación está pensada para ser discreta y respetuosa.' },
    ],
  },
  {
    id: 'gr-encourage',
    title: 'Animar a los miembros',
    tags: ['animar', 'apoyar', 'reaccionar', 'motivar', 'recordatorio amistoso'],
    summary: 'Envía porras y reacciones para mantener motivado a tu equipo.',
    overview:
      'El compromiso funciona porque la gente se da cuenta. Envía una porra o reacción con un solo toque para celebrar una racha, felicitar un entrenamiento o darle un empujoncito a quien todavía no ha registrado nada hoy. Toma un segundo y significa mucho.',
    steps: [
      'Abre el perfil de un miembro o una publicación en el feed del grupo.',
      'Toca una reacción rápida, por ejemplo 👏 Buen trabajo, 🔥 Sigue así o 💪 Tú puedes.',
      'La persona recibe una notificación al instante. No hace falta escribir nada.',
    ],
    tips: [
      'Un recordatorio amistoso a alguien que no ha registrado nada hoy puede marcar la diferencia entre mantener o perder una racha.',
      'Reaccionar a las comidas y entrenamientos en el feed mantiene a todo el grupo involucrado.',
    ],
    faqs: [
      { q: '¿Las porras envían una notificación?', a: 'Sí: la persona que animas recibe una notificación dentro de la app y una notificación push si las tiene activadas.' },
      { q: '¿Hay un límite?', a: 'Hay un límite por hora bastante generoso, para que las porras se sientan especiales y no como spam.' },
    ],
  },
  {
    id: 'gr-feed',
    title: 'Resumen del feed del grupo',
    tags: ['feed del grupo', 'publicaciones', 'actividad del grupo', 'comentarios', 'muro de actividad'],
    summary: 'Qué aparece en el feed y cómo interactuar con él.',
    overview:
      'El feed es donde aparece la actividad de registro de tu grupo: comidas, entrenamientos, logros y momentos destacados de los desafíos. Puedes reaccionar, comentar y animar. Es el corazón de un grupo activo.',
    steps: [
      'Abre la pestaña Feed.',
      'Desplázate por las comidas, actividades y logros recientes de tu grupo.',
      'Reacciona o comenta una publicación.',
      'Toca el nombre de alguien para ver su perfil y su progreso.',
    ],
    tips: [
      'Las tarjetas de logros (como alcanzar una racha) se publican automáticamente para celebrar tus avances.',
      'Lo que compartes en el feed depende de tu modo de privacidad.',
    ],
    faqs: [
      { q: '¿Por qué no veo publicaciones de nadie?', a: 'Puede que aún no formes parte de un grupo, o que los miembros tengan activado un modo de privacidad privado. Únete a un grupo o crea uno para empezar.' },
      { q: '¿Puedo ocultar una comida del feed?', a: 'Sí: tu modo de privacidad y la configuración de cada comida determinan qué se comparte. Consulta Privacidad del grupo.' },
    ],
  },
  {
    id: 'gr-privacy',
    title: 'Privacidad del grupo',
    tags: ['privacidad', 'ocultar actividad', 'visibilidad', 'modo privado', 'qué ven los demás'],
    summary: 'Controla exactamente qué puede ver tu grupo.',
    overview:
      'Tú decides cuánto ve tu grupo. Los modos de privacidad van desde compartir todos los detalles, hasta compartir solo un resumen, solo fotos de tus comidas, o un modo privado que oculta por completo tu actividad del feed. Tus datos personales nunca se comparten más allá de lo que tú elijas.',
    steps: [
      'Ve a Configuración → Privacidad.',
      'Elige tu modo de privacidad para el feed del grupo.',
      'Si tu grupo tiene un Coach, puedes ajustar opcionalmente qué información puede ver.',
      'Guarda los cambios. Se aplicarán a toda tu actividad en el grupo.',
    ],
    tips: [
      'Usa el modo privado cuando quieras seguir registrando sin compartir por un tiempo; tu racha seguirá contando.',
      'Incluso cuando compartes, datos sensibles como tu peso exacto nunca quedan expuestos a otros miembros.',
    ],
    faqs: [
      { q: '¿Los miembros pueden ver mi peso?', a: 'No. Otros miembros nunca ven tu peso exacto; como máximo, una indicación de progreso segura para tu privacidad, si eliges compartirla.' },
      { q: '¿Qué hace el modo privado?', a: 'Mantiene tu registro solo para ti, fuera del feed del grupo, mientras sigues teniendo todo tu seguimiento y tus rachas personales.' },
    ],
  },
]
