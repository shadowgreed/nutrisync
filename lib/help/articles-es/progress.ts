import type { ArticleTranslation } from '../types'

export const progressEs: ArticleTranslation[] = [
  {
    id: 'pr-weight-trends',
    title: 'Tendencia de peso',
    tags: ['peso', 'tendencia de peso', 'gráfica de peso', 'báscula', 'progreso'],
    summary: 'Cómo registrar tu peso y leer tu tendencia a lo largo del tiempo.',
    overview:
      'Tu peso del día a día varía por retención de líquidos, comida y sueño — un solo número puede confundir más de lo que aclara. NutriSync grafica tus registros de peso a lo largo del tiempo para que veas la dirección real. Registra con regularidad y presta atención a la tendencia, no al ruido de cada día.',
    steps: [
      'Usa el botón de registro rápido y elige Registrar peso (o actualízalo desde tu perfil).',
      'Ingresa tu peso.',
      'Abre la pestaña Tendencias para ver tu gráfica de peso a lo largo del tiempo.',
      'Fíjate en la dirección de la línea a través de las semanas, no en los días individuales.',
    ],
    tips: [
      'Pésate a una hora consistente — a primera hora de la mañana funciona muy bien.',
      'Es normal que suba y baje. Una tendencia de 2 a 4 semanas te muestra la realidad.',
    ],
    faqs: [
      { q: '¿Con qué frecuencia debería pesarme?', a: 'Unas pocas veces por semana es más que suficiente para ver una tendencia. Pesarte a diario también está bien, siempre que te enfoques en la línea y no en el número.' },
      { q: '¿Actualizar mi peso cambia mi objetivo de calorías?', a: 'Sí. Mantener tu peso actualizado hace que tu objetivo de calorías y tus estimaciones de actividad sigan siendo precisos.' },
    ],
  },
  {
    id: 'pr-streak-tracking',
    title: 'Rachas de registro',
    tags: ['racha', 'cómo funcionan las rachas', 'días consecutivos', 'racha de días', 'fuego'],
    summary: 'Cómo se cuentan las rachas y qué las mantiene vivas.',
    overview:
      'Tu racha es la cantidad de días seguidos en los que has registrado al menos una comida. Es la medida más simple de consistencia — lo que realmente impulsa los resultados. Las rachas premian que sigas presente, no la perfección.',
    steps: [
      'Registra al menos una comida cada día para mantener tu racha.',
      'Consulta tu racha actual en tu panel principal y en tu perfil.',
      'Si todavía no has registrado nada hoy, tu racha sigue a salvo hasta que termine el día.',
    ],
    tips: [
      'Un snack también cuenta. La meta es "registrar algo", no "tener un día perfecto".',
      'Hay un pequeño margen para que tu racha no se vea rota antes de que hayas registrado algo ese día.',
    ],
    faqs: [
      { q: '¿Por qué no subió mi racha?', a: 'La racha cuenta días, no comidas — registrar dos veces en un mismo día no suma dos. Aumenta una sola vez por cada día que registras. Consulta "La racha no se actualiza" en Solución de problemas.' },
      { q: '¿Qué hace que se rompa una racha?', a: 'Un día completo del calendario sin ninguna comida registrada. Registra todos los días — aunque sea rápido — para mantenerla.' },
    ],
  },
  {
    id: 'pr-goal-progress',
    title: 'Progreso hacia tu objetivo',
    tags: ['progreso del objetivo', 'cuánto falta', 'peso meta', 'barra de progreso'],
    summary: 'Descubre cuánto has avanzado hacia tu objetivo.',
    overview:
      'NutriSync muestra tu progreso hacia tu objetivo en términos simples — cuánto peso te falta para llegar a tu meta, tu promedio diario de calorías frente a tu objetivo, y cuántos días activos llevas esta semana. Es tu vistazo rápido a "¿voy por buen camino?".',
    steps: [
      'Abre la pestaña Tendencias o tu perfil.',
      'Revisa tu progreso de peso hacia tu meta.',
      'Compara tu promedio de calorías con tu objetivo de la semana.',
      'Échale un vistazo a tus días activos y tu consistencia para completar el panorama.',
    ],
    tips: [
      'El progreso casi nunca es una línea recta. Fíjate en la dirección general.',
      'Si el progreso se estanca por unas semanas, revisa tu objetivo o tu nivel de actividad — tus necesidades pueden haber cambiado.',
    ],
    faqs: [
      { q: '¿Por qué otras personas ven mi progreso como "cuánto falta" en lugar del peso exacto?', a: 'Para proteger tu privacidad, los integrantes del grupo nunca ven tu peso exacto — solo una versión que protege tu privacidad, si decides compartir tu progreso.' },
      { q: 'Definí un peso meta pero no veo una barra, ¿por qué?', a: 'La barra de progreso necesita un peso actual y un peso meta. Agrega tu peso meta en tu perfil.' },
    ],
  },
  {
    id: 'pr-weekly',
    title: 'Resúmenes semanales',
    tags: ['resumen semanal', 'recap', 'reporte de la semana', 'resumen', 'semana'],
    summary: 'Tu recuento semanal de calorías, nutrientes, actividad e hidratación.',
    overview:
      'Cada semana NutriSync te muestra un recuento de cómo te fue: tu promedio de calorías frente a tu objetivo, tus nutrientes más fuertes y los que necesitan más atención, tus días activos y tu hidratación. Es una lectura rápida que convierte una semana de registros en una o dos cosas claras en las que enfocarte.',
    steps: [
      'Abre el Resumen semanal cuando esté listo (te avisaremos).',
      'Revisa las calorías, los nutrientes, la actividad y el agua de la semana.',
      'Toma nota del nutriente o hábito que te sugiere trabajar.',
      'Lleva ese enfoque contigo a la semana que comienza.',
    ],
    tips: [
      'El resumen es más preciso cuando registras la mayoría de los días — los días sin registro dejan huecos.',
      'Elige una sola mejora por semana en lugar de intentar cambiarlo todo de una vez.',
    ],
    faqs: [
      { q: '¿Cuándo aparece el resumen semanal?', a: 'Al final de cada semana, una vez que hay suficientes registros para armar el resumen.' },
      { q: '¿Por qué dice "sin datos"?', a: 'No hubo suficientes registros esa semana. Registra más días y el resumen de la próxima semana se completará.' },
    ],
  },
  {
    id: 'pr-daily-averages',
    title: 'Promedio diario de calorías',
    tags: ['promedio de calorías', 'promedio diario', 'tendencia', 'calorías por día'],
    summary: 'Por qué tu promedio dice más que cualquier día individual.',
    overview:
      'Un solo día por encima o por debajo de tu objetivo no dice mucho. Tu promedio diario a lo largo de la semana es lo que realmente moldea los resultados. NutriSync muestra tu promedio de calorías por día registrado junto a tu objetivo, y colorea cada día para que veas de un vistazo cuándo estuviste por debajo o por encima.',
    steps: [
      'Abre la pestaña Tendencias.',
      'Busca tu promedio de calorías por día en el rango seleccionado.',
      'Compáralo con la línea de tu objetivo.',
      'Revisa las barras diarias — los días por debajo y por encima del objetivo se muestran en colores distintos.',
    ],
    tips: [
      'Apunta a que tu promedio se acerque a tu objetivo a lo largo de la semana, no cada día en particular.',
      'Unos días más altos está bien si tu promedio se mantiene. Esa flexibilidad es lo que hace que un plan sea sostenible.',
    ],
    faqs: [
      { q: '¿Por qué algunas barras tienen un color distinto?', a: 'El color de la barra muestra si ese día estuviste en o por debajo de tu objetivo, o por encima de él — un vistazo rápido a tu semana. Refleja tus datos, no tu dispositivo.' },
      { q: '¿Un día sin registrar cuenta como cero?', a: 'Los promedios se calculan según los días que registraste, así que un día sin registro no hace que tu promedio caiga a cero. Aun así, registrar todos los días te da el panorama más real.' },
    ],
  },
]
