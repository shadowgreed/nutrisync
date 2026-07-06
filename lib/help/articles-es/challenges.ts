import type { ArticleTranslation } from '../types'

export const challengesEs: ArticleTranslation[] = [
  {
    id: 'ch-what',
    title: '¿Qué son los desafíos?',
    tags: ['desafío', 'qué es un desafío', 'competencia', 'meta grupal', 'reto'],
    summary: 'Metas grupales con duración limitada que convierten los hábitos en una competencia amistosa.',
    overview:
      'Un desafío es una meta compartida en la que tu grupo trabaja durante una cantidad de días determinada — por ejemplo, registrar una comida todos los días durante dos semanas. El progreso de todos se calcula automáticamente a partir de lo que registras, con una tabla de posiciones, un total del equipo y seguimiento diario para mantener el impulso.',
    steps: [
      'Abre la pestaña Desafíos.',
      'Únete a un desafío activo o crea uno nuevo.',
      'Registra como siempre — tu progreso se actualiza automáticamente.',
      'Revisa la tabla de posiciones y el estado del día para mantenerte encaminado.',
    ],
    tips: [
      'Los desafíos se realizan dentro de un grupo, así que primero crea o únete a uno.',
      'Elige una duración que puedas cumplir realmente — terminar un desafío de 7 días es mejor que abandonar uno de 30.',
    ],
    faqs: [
      { q: '¿Tengo que ingresar mi progreso manualmente?', a: 'No. El progreso se calcula a partir de tu registro habitual — comidas, actividades o agua, según el tipo de desafío.' },
      { q: '¿Todos pueden ganar?', a: 'Sí. Los desafíos se tratan de alcanzar la meta, no solo de superar a los demás. La tabla de posiciones añade una competencia amistosa como extra.' },
    ],
  },
  {
    id: 'ch-create',
    title: 'Crear un desafío',
    tags: ['crear desafío', 'nuevo desafío', 'iniciar desafío', 'configurar desafío'],
    summary: 'Configura un desafío para tu grupo en menos de un minuto.',
    overview:
      'Crear un desafío toma solo unos toques: elige qué quieres registrar, cuánto durará y una meta. NutriSync sugiere una meta razonable según el tipo y la duración, y cada desafío muestra la insignia de recompensa que estás buscando obtener.',
    steps: [
      'Abre la pestaña Desafíos y toca Nuevo (o elige una plantilla si no tienes desafíos aún).',
      'Elige un tipo: Nutrición, Actividad o Hidratación.',
      'Selecciona una duración: 7, 14 o 30 días.',
      'Ajusta la meta si quieres — se completa un valor predeterminado por ti.',
      'Ponle un título y toca Iniciar desafío.',
    ],
    tips: [
      'Las plantillas iniciales (Racha de registro, Agua, Actividad, Proteínas) son la forma más rápida de empezar.',
      'Quien crea el desafío puede eliminarlo; todos los integrantes del grupo pueden unirse y participar.',
    ],
    faqs: [
      { q: '¿Quién puede crear desafíos?', a: 'Cualquier integrante de un grupo puede crear uno para ese grupo.' },
      { q: '¿Puedo editar un desafío después de crearlo?', a: 'Los desafíos están diseñados para ser simples y justos, así que la meta y las fechas quedan fijas una vez iniciado. Si necesitas otra configuración, elimínalo y crea uno nuevo.' },
    ],
  },
  {
    id: 'ch-streak',
    title: 'Desafíos de racha (Racha de registro)',
    tags: ['desafío de racha', 'racha de registro', 'registrar todos los días', 'racha diaria'],
    summary: 'El desafío clásico: registra una comida todos los días.',
    overview:
      'Un desafío de Racha de registro premia la constancia. Cada día en el que registres al menos una comida cuenta como un éxito. Es el desafío más fácil de ganar y el mejor para construir el hábito diario de registrar, que es la base de todo lo demás.',
    steps: [
      'Crea un desafío y elige Racha de registro (Nutrición).',
      'Selecciona una duración e inícialo.',
      'Registra al menos una comida cada día para sumar ese día.',
      'Observa cómo crece tu racha y tu posición en la tabla.',
    ],
    tips: [
      'Un snack cuenta. La meta es registrar algo todos los días, no registrar a la perfección.',
      'Si andas ocupado, una foto rápida te salva el día — puedes ajustarla después.',
    ],
    faqs: [
      { q: '¿Qué pasa si me salto un día?', a: 'No sumas ese día, pero puedes seguir adelante y aun así terminar el desafío. Tu grupo puede animarte a retomar el ritmo.' },
      { q: '¿La racha del desafío es la misma que la racha de la app?', a: 'Están relacionadas pero son distintas. El desafío cuenta los días dentro de su propia ventana de tiempo; tu racha general cuenta tu registro diario continuo.' },
    ],
  },
  {
    id: 'ch-types',
    title: 'Tipos de desafíos',
    tags: ['tipos de desafíos', 'proteínas', 'micronutrientes', 'días activos', 'agua', 'opciones de desafíos'],
    summary: 'Los tipos de desafíos que puedes crear, entre nutrición, actividad e hidratación.',
    overview:
      'Los desafíos vienen en tres categorías. Cada una define un "día exitoso" a su manera, y el progreso se mide automáticamente a partir de lo que registras.',
    steps: [
      'Nutrición — Racha de registro: registra una comida cada día. Impulso de proteínas: alcanza un día alto en proteínas. Maestro de micronutrientes: llega a varias metas de nutrientes en un día.',
      'Actividad — Días activos: registra un entrenamiento o actividad ese día.',
      'Hidratación — Desafío de agua: bebe suficiente agua (un umbral diario) ese día.',
      'Elige el que mejor se ajuste al hábito que tu grupo quiere construir.',
    ],
    tips: [
      'Los desafíos de Actividad y Agua suman cualquier día en el que registres una actividad válida o suficiente agua — victorias sencillas que construyen hábitos reales.',
      'Alterna los tipos de desafío para mantener a tu grupo motivado en nutrición, movimiento e hidratación.',
    ],
    faqs: [
      { q: '¿Hay un desafío de pérdida de peso?', a: 'Por ahora no. Para mantener la privacidad del peso de cada persona, los desafíos siguen el registro, la nutrición, la actividad y la hidratación en lugar de la báscula. Con el tiempo podrían agregarse más tipos.' },
      { q: '¿Cómo se define un "día de proteínas" o un "día de agua"?', a: 'Cada tipo tiene un umbral diario claro que se muestra en el desafío — por ejemplo, una meta de proteínas o una cantidad mínima de agua.' },
    ],
  },
  {
    id: 'ch-rankings',
    title: 'Posiciones del desafío',
    tags: ['tabla de posiciones', 'ranking', 'clasificación', 'progreso del equipo', 'posiciones'],
    summary: 'Cómo funcionan la tabla de posiciones, el progreso del equipo y el estado del día.',
    overview:
      'Cada desafío muestra tres vistas del progreso: tu progreso personal, una tabla de posiciones de todos los participantes y el total combinado del equipo. Una lista de "estado del día" muestra quién ya cumplió el requisito de hoy, para que sepas a quién animar.',
    steps: [
      'Abre un desafío para ver tu tarjeta de progreso y tu ritmo actual.',
      'Revisa la tabla de posiciones — los integrantes se clasifican por progreso, con medallas para los tres primeros.',
      'Consulta el progreso del equipo para ver el porcentaje combinado del grupo hacia la meta.',
      'Usa el estado del día para felicitar a quienes ya cumplieron y animar a quienes aún no han registrado.',
    ],
    tips: [
      'Los empates se resuelven por la racha actual, así que la constancia vale la pena.',
      'Una etiqueta de estado (Al día / A recuperar / Completado) te muestra de un vistazo cómo vas.',
    ],
    faqs: [
      { q: '¿Cómo se decide la posición?', a: 'Según la cantidad de días exitosos que hayas acumulado, de mayor a menor. Si dos personas empatan, gana quien tenga la racha actual más larga.' },
      { q: '¿Qué es el "progreso del equipo"?', a: 'Los días exitosos combinados del grupo frente al total posible — una meta compartida a la que todos contribuyen.' },
    ],
  },
  {
    id: 'ch-completion',
    title: 'Completar un desafío',
    tags: ['completar desafío', 'terminar desafío', 'recompensa', 'insignia', 'ganar desafío'],
    summary: 'Qué significa completar un desafío y la recompensa que obtienes.',
    overview:
      'Completas un desafío cuando alcanzas su meta — por ejemplo, suficientes días registrados antes de la fecha de finalización. Cada desafío muestra la insignia de recompensa que estás buscando obtener, y alcanzar hitos en el camino se celebra en el desafío y en el feed de tu grupo.',
    steps: [
      'Alcanza la cantidad de días exitosos que exige la meta del desafío.',
      'Tu estado cambia a Completado y se desbloquea tu insignia de recompensa.',
      'Los momentos destacados (como una racha de 7 días o que el equipo llegue al 50%) se resaltan automáticamente.',
    ],
    tips: [
      'Puedes seguir registrando después de completar el desafío para aportar al total combinado de tu equipo.',
      'Terminar incluso un desafío corto genera impulso para el siguiente.',
    ],
    faqs: [
      { q: '¿Qué obtengo al completar un desafío?', a: 'Una insignia de recompensa asociada al desafío, además de la racha y el hábito que construiste en el camino.' },
      { q: '¿Qué pasa si el desafío termina antes de que alcance la meta?', a: 'Conservas todo el progreso y los días que registraste. Inicia otro desafío para seguir construyendo tu racha.' },
    ],
  },
]
