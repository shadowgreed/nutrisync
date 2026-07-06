import type { ArticleTranslation } from '../types'

export const accountEs: ArticleTranslation[] = [
  {
    id: 'ac-profile',
    title: 'Actualizar tu perfil',
    tags: ['perfil', 'editar perfil', 'cambiar nombre', 'foto de perfil', 'peso', 'estatura'],
    summary: 'Cambia tu nombre, foto, datos corporales, nivel de actividad u objetivo.',
    overview:
      'Tu perfil guarda los datos que personalizan NutriSync: tu nombre y foto, además de los datos corporales, el nivel de actividad y el objetivo que definen tus metas de calorías y nutrientes. Mantenlos actualizados para que tus números sigan siendo precisos.',
    steps: [
      'Ve a Perfil → Editar.',
      'Actualiza tu nombre, foto, estatura, peso, nivel de actividad u objetivo.',
      'Guarda. Las metas que dependen de estos datos se actualizan de inmediato.',
    ],
    tips: [
      'Actualiza tu peso a medida que cambie para que tu meta de calorías se ajuste con él.',
      'Tu nombre y foto son lo que ve tu grupo en el feed.',
    ],
    faqs: [
      { q: '¿Cambiar mis datos reinicia mi historial?', a: 'No. Tus registros y rachas se mantienen; solo se ajustan tus metas a partir de ahora.' },
      { q: '¿Mi información personal es privada?', a: 'Sí. Tus datos se usan para calcular tus metas y no se comparten con tu grupo.' },
    ],
  },
  {
    id: 'ac-notifications',
    title: 'Configuración de notificaciones',
    tags: ['notificaciones', 'avisos', 'alertas', 'recordatorios', 'desactivar notificaciones'],
    summary: 'Elige qué notificaciones recibes y de qué forma.',
    overview:
      'Las notificaciones te mantienen al tanto: ánimos de tu grupo, logros de desafíos, recordatorios y resúmenes semanales. Tú decides cuáles recibir y puedes desactivar las que no quieras.',
    steps: [
      'Ve a Configuración → Notificaciones.',
      'Activa o desactiva cada tipo de notificación por separado.',
      'Activa las notificaciones push si quieres recibir alertas en tu dispositivo.',
      'Guarda tus preferencias.',
    ],
    tips: [
      'Mantén activos los ánimos y las alertas de desafíos: son parte de lo que mantiene activo a un grupo.',
      'Si no te llegan notificaciones push, revisa Problemas con las notificaciones en Solución de problemas.',
    ],
    faqs: [
      { q: '¿Por qué no me llegó una notificación?', a: 'Las notificaciones push deben estar activadas tanto en NutriSync como en la configuración de tu dispositivo. Consulta Problemas con las notificaciones.' },
      { q: '¿Puedo silenciar un grupo?', a: 'Usa la configuración de notificaciones para reducir las alertas. Igual verás las novedades en el feed cuando abras la app.' },
    ],
  },
  {
    id: 'ac-plans',
    title: '¿NutriSync es gratis?',
    tags: ['gratis', 'precio', 'costo', 'plan', 'suscripción', 'cuánto cuesta'],
    summary: 'NutriSync es gratis: todas las funciones están incluidas sin costo.',
    overview:
      'NutriSync es gratuito y no tiene compras dentro de la app. El registro de comidas, actividad, hidratación, tu panel principal, grupos, desafíos, tendencias y resúmenes semanales están incluidos sin costo alguno.',
    steps: [
      'Crea una cuenta y empieza a registrar — no hay nada que comprar.',
      'Consulta tu plan cuando quieras en Configuración → Plan actual.',
    ],
    tips: [
      'No hay muro de pago: todas las pantallas y funciones están disponibles para todos.',
      'Si en algún momento se agregan funciones de pago, se te informará claramente el precio y las condiciones antes de cobrarte nada.',
    ],
    faqs: [
      { q: '¿Tengo que pagar por algo?', a: 'No. NutriSync es gratis por ahora y no tiene compras dentro de la app.' },
      { q: '¿Siempre será gratis?', a: 'El seguimiento principal es gratis hoy. Si eso llegara a cambiar, te mostraremos el precio y las condiciones con anticipación — nunca se te cobrará sin que tú lo aceptes primero.' },
    ],
  },
  {
    id: 'ac-leaving',
    title: 'Dejar NutriSync',
    tags: ['cancelar', 'dejar de usar', 'salir', 'darse de baja', 'tomar un descanso'],
    summary: 'No hay nada que cancelar: cómo tomarte un descanso o eliminar tu cuenta.',
    overview:
      'NutriSync es gratis y no tiene suscripción, así que no hay nada que cancelar. Si quieres tomar distancia, puedes activar el modo privado o simplemente dejar de registrar — y si quieres irte definitivamente, puedes eliminar tu cuenta de forma permanente.',
    steps: [
      'Para un descanso: ve a Configuración → Privacidad y pon tu perfil como Privado.',
      'Para salir de un grupo: abre el grupo y elige Salir del grupo.',
      'Para eliminar todo: ve a Configuración → Privacidad → Eliminar cuenta.',
    ],
    tips: [
      'Cambiar a Privado conserva tus datos y tu racha, pero te oculta de tu grupo.',
      'Eliminar tu cuenta es permanente y borra todos tus datos.',
    ],
    faqs: [
      { q: '¿Hay alguna suscripción que cancelar?', a: 'No. NutriSync es gratis y no tiene compras dentro de la app, así que no hay nada que cancelar ni de qué darse de baja.' },
      { q: '¿Puedo simplemente tomarme un descanso?', a: 'Sí — pon tu perfil como Privado en Configuración → Privacidad, o deja de registrar por un tiempo. Tu cuenta se mantiene hasta que decidas eliminarla.' },
    ],
  },
  {
    id: 'ac-delete',
    title: 'Eliminar tu cuenta',
    tags: ['eliminar cuenta', 'borrar cuenta', 'borrar datos', 'cerrar cuenta', 'dar de baja cuenta'],
    summary: 'Cómo eliminar tu cuenta y tus datos de forma permanente.',
    overview:
      'Puedes eliminar tu cuenta de forma permanente. Esto borra tu perfil, tus registros y tu historial, y no se puede deshacer. Si eres fundador de un grupo, considera transferirlo o cerrarlo antes de eliminar tu cuenta.',
    steps: [
      'Ve a Configuración → Privacidad → Eliminar cuenta.',
      'Lee la confirmación con atención: esta acción es permanente.',
      'Confirma para eliminar tu cuenta y todos tus datos.',
    ],
    tips: [
      'Si solo quieres un descanso, el modo de privacidad privado te permite alejarte sin eliminar nada.',
      'También puedes descargar una copia de tus datos antes: Configuración → Privacidad → Exportar mis datos.',
    ],
    faqs: [
      { q: '¿Puedo recuperar mi cuenta después de eliminarla?', a: 'No. La eliminación es permanente y borra tus datos.' },
      { q: '¿Qué pasa con mi grupo?', a: 'Tus propios datos se eliminan. Si fundaste un grupo, resuelve su futuro antes de eliminar tu cuenta.' },
    ],
  },
  {
    id: 'ac-export',
    title: 'Exportar tus datos',
    tags: ['exportar datos', 'descargar datos', 'copia de seguridad', 'respaldo', 'mis datos'],
    summary: 'Descarga una copia de todo lo que has registrado.',
    overview:
      'Puedes descargar todos tus propios datos — perfil, comidas, actividad, agua, peso, reacciones, comentarios, membresías de grupo, desafíos que creaste y logros — en un solo archivo JSON, cuando quieras.',
    steps: [
      'Ve a Configuración → Privacidad.',
      'En Datos, toca Exportar mis datos.',
      'Se descarga un archivo JSON a tu dispositivo.',
    ],
    tips: [
      'La exportación es una foto del momento en que la descargas — puedes generarla de nuevo cuando quieras para tener una copia actualizada.',
      'Es buena idea exportar tus datos antes de eliminar tu cuenta si quieres conservar tu historial.',
    ],
    faqs: [
      { q: '¿En qué formato se exportan los datos?', a: 'En un solo archivo JSON con tu información — legible para ti e importable en otras herramientas.' },
      { q: '¿Incluye datos de otras personas?', a: 'No. La exportación contiene únicamente tus propios datos.' },
    ],
  },
]
