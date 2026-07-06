import type { ArticleTranslation } from '../types'

export const gettingStartedEs: ArticleTranslation[] = [
  {
    id: 'gs-what-is-nutrisync',
    title: '¿Qué es NutriSync?',
    tags: ['introducción', 'qué es nutrisync', 'primeros pasos', 'información general'],
    summary: 'Un vistazo rápido a lo que hace NutriSync y cómo te ayuda a comer mejor junto a tus amigos.',
    overview:
      'NutriSync es un contador de nutrición basado en la responsabilidad compartida. Registras tus comidas en segundos —normalmente con solo tomar una foto— y obtienes al instante las calorías, macronutrientes y micronutrientes. Luego compartes tu progreso con un grupo privado, se motivan entre todos y participan en desafíos para mantener la constancia.',
    steps: [
      'Registra una comida con foto, búsqueda o código de barras para ver su información nutricional.',
      'Observa cómo se actualizan tu presupuesto diario de calorías, tu hidratación y tus nutrientes.',
      'Únete a un grupo o crea uno para compartir tu progreso con personas de confianza.',
      'Inicia un desafío para convertir tus buenos hábitos en una racha constante.',
    ],
    tips: [
      'No necesitas registrar todo a la perfección. La constancia importa más que la precisión: un estimado rápido todos los días es mejor que un registro exacto una vez por semana.',
      'El componente social es el ingrediente secreto: las personas que registran en grupo mantienen el hábito por mucho más tiempo.',
    ],
    faqs: [
      { q: '¿NutriSync es gratis?', a: 'Las funciones principales de seguimiento son gratuitas. Algunas funciones avanzadas de Coach forman parte de un plan de pago; consulta Cuenta y facturación.' },
      { q: '¿Tengo que usar grupos?', a: 'No. Puedes llevar tu seguimiento completamente solo. Los grupos son opcionales, pero son lo que ayuda a que los hábitos se mantengan.' },
    ],
  },
  {
    id: 'gs-getting-started',
    title: 'Primeros pasos',
    tags: ['primeros pasos', 'empezar', 'configuración inicial', 'onboarding'],
    summary: 'Lo primero que debes hacer después de crear tu cuenta.',
    overview:
      'La configuración inicial toma unos dos minutos. Durante este proceso, le cuentas a NutriSync un poco sobre ti para que pueda calcular un objetivo diario de calorías y nutrientes preciso. Puedes cambiar todo esto después desde tu perfil.',
    steps: [
      'Crea tu cuenta y confirma tu correo electrónico.',
      'Ingresa tus datos básicos: estatura, peso, edad y sexo biológico (se usan solo para estimar tus necesidades calóricas).',
      'Elige tu nivel de actividad: qué tan activo eres en un día normal.',
      'Elige tu objetivo: bajar de peso, mantenerte, ganar músculo o mejorar tu salud.',
      'Registra tu primera comida para ver cómo cobra vida tu panel principal.',
    ],
    tips: [
      'Sé honesto con tu nivel de actividad. Sobrestimarlo infla tu objetivo de calorías.',
      'Puedes editar cualquiera de estas respuestas después desde Perfil → Editar.',
    ],
    faqs: [
      { q: '¿Por qué me pide mi peso y estatura?', a: 'Se usan para estimar cuántas calorías quema tu cuerpo en reposo, lo que define tu objetivo diario. Tus datos son privados.' },
      { q: '¿Puedo saltarme el proceso de configuración inicial?', a: 'Puedes avanzar rápido, pero ingresar tus datos básicos es lo que hace que tus objetivos de calorías y nutrientes sean precisos.' },
    ],
  },
  {
    id: 'gs-setting-goals',
    title: 'Cómo definir tus objetivos',
    tags: ['objetivos', 'bajar de peso', 'ganar músculo', 'mantener peso', 'meta'],
    summary: 'Cómo tu objetivo determina tu meta de calorías y qué significa cada opción.',
    overview:
      'Tu objetivo le indica a NutriSync cómo ajustar tu objetivo diario de calorías. Es el factor que más influye en tus números, así que elige el que mejor se ajuste a lo que buscas en este momento. Puedes cambiarlo cuando quieras.',
    steps: [
      'Ve a Perfil → Editar.',
      'Abre la sección de Objetivo.',
      'Elige uno: Bajar de peso, Mantenerme, Ganar músculo o Mejorar mi salud.',
      'Guarda los cambios. Tu objetivo de calorías se actualiza de inmediato.',
    ],
    tips: [
      'Bajar de peso aplica un déficit calórico diario moderado (alrededor de 500 kcal) para perder aproximadamente medio kilo por semana.',
      'Ganar músculo agrega un pequeño superávit calórico para que tengas energía suficiente para entrenar y crecer.',
      'Mantenerme y Mejorar mi salud te mantienen en tu necesidad diaria estimada.',
    ],
    faqs: [
      { q: '¿Puedo tener más de un objetivo?', a: 'Tu objetivo de calorías sigue a tu objetivo principal. Aun así, puedes seguir registrando todo lo demás (actividad, nutrientes, agua) sin importar el objetivo que elijas.' },
      { q: '¿Con qué frecuencia debería cambiar mi objetivo?', a: 'Solo cuando cambie tu intención real. Cambiarlo constantemente dificulta saber si un enfoque está funcionando.' },
    ],
  },
  {
    id: 'gs-first-meal',
    title: 'Cómo registrar tu primera comida',
    tags: ['registrar comida', 'primera comida', 'foto', 'comida', 'agregar comida'],
    summary: 'La forma más rápida de registrar una comida y ver tu nutrición del día.',
    overview:
      'La manera más rápida de registrar una comida es con una foto: NutriSync identifica los alimentos y calcula su información nutricional por ti. También puedes buscar un alimento por nombre o escanear un código de barras. Cada comida cuenta para tu presupuesto diario y tu racha de registros.',
    steps: [
      'Toca el botón + (registrar).',
      'Toma o elige una foto de tu comida, o cambia a Buscar o Código de barras.',
      'Revisa los alimentos detectados y ajusta el tamaño de la porción si es necesario (pequeña, mediana, grande, o una cantidad específica).',
      'Elige el tipo de comida (desayuno, almuerzo, cena o snack).',
      'Guarda. Tu panel principal y tu racha se actualizan de inmediato.',
    ],
    tips: [
      'Una buena iluminación y una foto tomada desde arriba mejoran la estimación.',
      'Puedes editar cualquier detalle después de guardar, así que no te preocupes por que quede perfecto la primera vez.',
    ],
    faqs: [
      { q: '¿Qué pasa si la foto se equivoca?', a: 'Toca la comida para editarla: cambia un alimento, ajusta la porción o elimina un elemento. Consulta Cómo editar comidas.' },
      { q: '¿Un snack cuenta para mi racha?', a: 'Sí. Cualquier comida registrada ese día mantiene tu racha activa.' },
    ],
  },
  {
    id: 'gs-dashboard',
    title: 'Cómo entender tu panel principal',
    tags: ['panel principal', 'inicio', 'presupuesto de calorías', 'anillos de progreso', 'resumen'],
    summary: 'Qué significa cada número en tu pantalla de inicio.',
    overview:
      'Tu panel principal es tu resumen diario: cuántas calorías te quedan, cómo van tus macronutrientes y nutrientes clave, tu hidratación y tu racha actual. Se reinicia cada día a medianoche según tu hora local.',
    steps: [
      'Abre la pestaña Hoy.',
      'Revisa tu presupuesto de calorías: calorías consumidas frente a tu objetivo diario.',
      'Revisa tus macronutrientes (proteínas, carbohidratos, grasas, fibra) y el progreso de tus nutrientes.',
      'Registra el agua que bebas y échale un vistazo a tu racha en la parte superior.',
    ],
    tips: [
      'Toca una comida del día para revisar o editar todos sus detalles.',
      'El botón de registro rápido siempre está disponible para agregar una comida, agua o peso en un par de toques.',
    ],
    faqs: [
      { q: '¿Cuándo se reinicia mi día?', a: 'A medianoche según la hora local de tu dispositivo. Las comidas se agrupan según el día local en que las registraste.' },
      { q: '¿Por qué mi presupuesto de calorías es diferente al de un amigo?', a: 'Los objetivos son personales: dependen de tus datos corporales, tu nivel de actividad y tu objetivo.' },
    ],
  },
  {
    id: 'gs-calorie-targets',
    title: 'Cómo entender tu objetivo de calorías',
    tags: ['objetivo de calorías', 'tdee', 'tmb', 'presupuesto de calorías', 'cómo se calcula'],
    summary: 'Cómo calcula NutriSync tu objetivo diario de calorías.',
    overview:
      'Tu objetivo se construye a partir de dos factores: cuántas calorías quema tu cuerpo y tu objetivo personal. NutriSync estima las calorías que quemas en reposo a partir de tu estatura, peso, edad y sexo, las ajusta según tu nivel de actividad y luego las adapta a tu objetivo.',
    steps: [
      'Se estima tu gasto en reposo a partir de tus datos corporales (fórmula de Mifflin-St Jeor).',
      'Ese valor se multiplica por tu nivel de actividad para estimar tu gasto total diario.',
      'Tu objetivo ajusta ese número: un déficit para bajar de peso, un superávit para ganar músculo, o sin cambios para mantenerte.',
      'El resultado es tu objetivo diario de calorías que se muestra en el panel principal.',
    ],
    tips: [
      'Mantener tu peso actualizado ayuda a que tu objetivo siga siendo preciso a medida que avanzas.',
      'Un objetivo es una guía, no una regla estricta. Las tendencias durante la semana importan más que un solo día.',
    ],
    faqs: [
      { q: '¿Por qué cambió mi objetivo?', a: 'Se actualiza cuando cambias tu peso, tu nivel de actividad o tu objetivo. Cada uno de esos datos alimenta el cálculo.' },
      { q: '¿Puedo definir mi objetivo manualmente?', a: 'NutriSync lo calcula a partir de tu perfil para que se mantenga acorde con tus datos. Actualiza tu perfil para modificarlo.' },
    ],
  },
]
