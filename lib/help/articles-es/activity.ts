import type { ArticleTranslation } from '../types'

export const activityEs: ArticleTranslation[] = [
  {
    id: 'ac-logging',
    title: 'Registrar actividades',
    tags: ['actividad', 'ejercicio', 'entrenamiento', 'registrar ejercicio', 'agregar actividad'],
    summary: 'Cómo registrar un entrenamiento y obtener una estimación de calorías quemadas.',
    overview:
      'Registrar tu actividad completa el panorama de tu día. Elige qué hiciste, cuánto tiempo y con qué intensidad — NutriSync estima las calorías que quemaste. Para caminatas, carreras, paseos en bici y senderismo, puedes registrar la distancia (o los pasos) en lugar de adivinar.',
    steps: [
      'Toca el botón + (registrar) y elige Actividad.',
      'Elige un tipo de actividad (caminar, correr, ciclismo, entrenamiento con pesas, yoga y más).',
      'Ingresa cuánto tiempo la hiciste y, si te lo pide, define la intensidad.',
      'Para actividades de distancia, ingresa la distancia o los pasos en lugar de la duración.',
      'Guarda — tu quema estimada se suma a tu día.',
    ],
    tips: [
      'Hasta una caminata corta cuenta. Registrarla refuerza el hábito y tu racha de días activos.',
      'Las actividades que compartes aparecen en el feed de tu grupo, así tu equipo puede alentarte.',
    ],
    faqs: [
      { q: '¿La actividad aumenta mi presupuesto de calorías?', a: 'NutriSync muestra tu actividad y su quema estimada junto con lo que consumes, para que veas el panorama completo de tu día.' },
      { q: '¿Mi grupo puede ver mis entrenamientos?', a: 'Los integrantes del grupo pueden ver la actividad que compartes, igual que con las comidas. Se aplican tus ajustes de privacidad.' },
    ],
  },
  {
    id: 'ac-burn',
    title: 'Cómo se calcula la quema de calorías',
    tags: ['calorías quemadas', 'quema de calorías', 'met', 'estimación de calorías'],
    summary: 'Cómo estima NutriSync las calorías que quemas al hacer actividad.',
    overview:
      'La quema de calorías se estima según el tipo de actividad, cuánto tiempo la hiciste, la intensidad y tu peso corporal. Las actividades más exigentes y de mayor duración queman más; a mayor peso corporal, se quema más con el mismo movimiento. Es una buena estimación, no una cifra medida por un dispositivo.',
    steps: [
      'Registra una actividad con su duración (o distancia) e intensidad.',
      'NutriSync combina esos datos con tu peso actual para estimar la quema.',
      'Consulta la estimación en la actividad y en los totales de tu día.',
    ],
    tips: [
      'Mantener tu peso actualizado hace que las estimaciones de quema sean más precisas.',
      'La intensidad importa: un trote suave y una carrera a máximo esfuerzo de la misma duración queman cantidades distintas.',
    ],
    faqs: [
      { q: '¿Por qué mi quema es diferente a la de mi reloj?', a: 'Los wearables usan sensores de frecuencia cardíaca; NutriSync usa una fórmula basada en el tipo de actividad, el tiempo, la intensidad y el peso. Es normal que sean similares pero no idénticos.' },
      { q: '¿Debería "recuperar" las calorías que quemé comiendo más?', a: 'Eso es una decisión personal. NutriSync te muestra los números; cómo los uses depende de ti y de tu objetivo.' },
    ],
  },
  {
    id: 'ac-editing',
    title: 'Editar actividades',
    tags: ['editar actividad', 'cambiar entrenamiento', 'corregir actividad', 'eliminar actividad', 'borrar entrenamiento'],
    summary: 'Corrige los detalles de una actividad registrada o elimínala.',
    overview:
      '¿Registraste una duración o un tipo de actividad equivocado? Abre la actividad para cambiar cualquier detalle, y la estimación de calorías se actualiza. También puedes eliminar una actividad que agregaste por error.',
    steps: [
      'Abre la actividad desde tu panel principal o el feed del grupo.',
      'Toca Editar.',
      'Actualiza el tipo, la duración, la intensidad, la distancia o los pasos.',
      'Guarda — o elige Eliminar para quitarla.',
    ],
    tips: [
      'Editar la intensidad es la forma más rápida de corregir una estimación que se ve muy alta o muy baja.',
      'Si registraste el mismo entrenamiento dos veces, elimina el duplicado.',
    ],
    faqs: [
      { q: '¿Editar una actividad afecta los desafíos?', a: 'Los desafíos de días activos cuentan cualquier día con una actividad registrada, así que editar detalles no te hará perder el día mientras quede al menos una actividad.' },
      { q: '¿Puedo cambiar la fecha de una actividad?', a: 'Sí, edita su fecha y hora para moverla al día correcto.' },
    ],
  },
  {
    id: 'ac-steps-distance',
    title: 'Pasos o distancia',
    tags: ['pasos', 'distancia', 'caminar', 'correr', 'ciclismo', 'senderismo', 'caminata'],
    summary: 'Cuándo registrar pasos y cuándo registrar distancia.',
    overview:
      'Para actividades a pie, como caminar, correr y hacer senderismo, puedes registrar pasos o distancia — lo que tengas disponible. El ciclismo solo usa distancia (no hay pasos que contar). NutriSync convierte entre ambos para estimar tu esfuerzo y la quema de calorías.',
    steps: [
      'Elige una actividad de distancia (caminar, correr, ciclismo o senderismo).',
      'Ingresa la distancia si la registraste, o los pasos para caminar, correr y senderismo.',
      'NutriSync convierte los pasos a distancia automáticamente cuando hace falta.',
      'Guarda para ver la quema estimada.',
    ],
    tips: [
      'Usa el dato que realmente tengas — no hace falta convertir nada a mano.',
      'El ciclismo cubre más distancia por minuto que caminar, por eso se registra por distancia y no por pasos.',
    ],
    faqs: [
      { q: '¿Cómo se convierten los pasos en distancia?', a: 'NutriSync usa una longitud de zancada promedio para convertir los pasos en kilómetros, y a partir de ahí estima la quema.' },
      { q: '¿Cuál es más preciso?', a: 'La distancia que mediste tú mismo (con GPS) suele ser la más precisa. Los pasos son una excelente alternativa.' },
    ],
  },
  {
    id: 'ac-estimates',
    title: 'Cómo funcionan las estimaciones de actividad',
    tags: ['estimación de calorías', 'precisión', 'por qué', 'calorías quemadas', 'valor met'],
    summary: 'Por qué las calorías de actividad son estimadas y qué las afecta.',
    overview:
      'Cada actividad tiene un costo energético típico según su intensidad. NutriSync multiplica ese valor por tu peso y por cuánto tiempo te moviste para estimar las calorías. Como no mide directamente tu frecuencia cardíaca ni tu esfuerzo, considera esta cifra como una estimación bien fundamentada.',
    steps: [
      'Elige el tipo de actividad que mejor coincida con lo que hiciste.',
      'Define la intensidad con honestidad — cambia el costo energético.',
      'Ingresa la duración o distancia de forma precisa.',
      'Mantén tu peso actualizado para lograr la estimación más cercana a la realidad.',
    ],
    tips: [
      'Si dos actividades se sintieron distintas pero se registran igual, casi siempre el ajuste de intensidad es la clave.',
      'Las estimaciones son más útiles como tendencia — compáralas semana a semana, no entrenamiento a entrenamiento.',
    ],
    faqs: [
      { q: '¿Por qué no coincide con mi caminadora?', a: 'Cada máquina y cada app usa su propio modelo de cálculo. Es normal que haya pequeñas diferencias entre estimaciones.' },
      { q: '¿Es precisa la opción "Otra"?', a: 'Para actividades que no están en la lista, "Otra" usa un promedio moderado. Cuando puedas, elige el tipo específico más parecido para obtener una mejor estimación.' },
    ],
  },
]
