import type { ArticleTranslation } from '../types'

export const foodLoggingEs: ArticleTranslation[] = [
  {
    id: 'fl-logging-food',
    title: 'Registrar comidas',
    tags: ['registrar comida', 'agregar comida', 'buscar alimento', 'código de barras', 'foto de comida'],
    summary: 'Las tres formas de registrar una comida: foto, búsqueda y código de barras.',
    overview:
      'Puedes registrar tus comidas de tres maneras. La foto es la más rápida: obtienes calorías, macronutrientes y micronutrientes de forma automática. La búsqueda es ideal cuando ya sabes el nombre del alimento. El código de barras es perfecto para productos empacados. Puedes combinarlas dentro de una misma comida.',
    steps: [
      'Toca el botón + (registrar).',
      'Elige Foto, Buscar o Código de barras.',
      'Agrega uno o más alimentos a la comida.',
      'Define la porción de cada alimento y elige el tipo de comida.',
      'Guarda.',
    ],
    tips: [
      'Puedes agregar varios alimentos a una misma comida antes de guardar.',
      'Agrega una descripción o foto opcional para que tu grupo vea lo que comiste en el feed.',
    ],
    faqs: [
      { q: '¿Puedo registrar comidas pasadas?', a: 'Sí. Registra la comida y ajusta la fecha y hora al editarla para que quede en el día correcto.' },
      { q: '¿Necesito internet para registrar comidas?', a: 'Las estimaciones por foto y la búsqueda necesitan conexión. Si algo falla al guardar, inténtalo de nuevo cuando vuelvas a estar en línea.' },
    ],
  },
  {
    id: 'fl-photos',
    title: 'Registrar comidas con foto',
    tags: ['foto de comida', 'cámara', 'inteligencia artificial', 'estimación de calorías', 'imagen del plato'],
    summary: 'Cómo funciona el registro por foto y cómo obtener las mejores estimaciones.',
    overview:
      'Cuando registras una comida con foto, NutriSync identifica los alimentos en tu plato y estima su información nutricional. Está diseñado para ser rápido: unos segundos en lugar de buscar en una base de datos. Siempre puedes revisar y ajustar antes de guardar.',
    steps: [
      'Toca + y elige Foto.',
      'Toma una foto clara y desde arriba de todo el plato.',
      'Espera unos segundos mientras se detectan los alimentos.',
      'Revisa cada alimento, corrige lo que no coincida y ajusta las porciones.',
      'Guarda.',
    ],
    tips: [
      'Una buena iluminación y un ángulo directo desde arriba dan los mejores resultados.',
      'Fotografía los alimentos antes de empezar a comer para que sea más fácil estimar las porciones.',
      'Para platillos mixtos, una descripción como "bowl de burrito de pollo" te ayuda a recordarlo y mejora la estimación.',
    ],
    faqs: [
      { q: '¿Qué tan precisa es la estimación?', a: 'Es una estimación, no una medición de laboratorio. Es lo suficientemente precisa para guiar tus decisiones diarias y detectar tendencias. Ajusta las porciones para obtener un número más exacto.' },
      { q: '¿Se comparten mis fotos de comida?', a: 'Solo si decides compartir la comida con tu grupo. Tu modo de privacidad controla lo que pueden ver los miembros del grupo. Consulta Privacidad del grupo.' },
    ],
  },
  {
    id: 'fl-editing',
    title: 'Editar comidas',
    tags: ['editar comida', 'cambiar comida', 'corregir porción', 'error al registrar'],
    summary: 'Cambia alimentos, porciones, tipo de comida u hora después de registrar.',
    overview:
      'Nada de lo que registras queda fijo. Abre cualquier comida para cambiar alimentos, ajustar porciones, modificar el tipo de comida, corregir la hora o editar la descripción. Tus totales diarios se recalculan al instante.',
    steps: [
      'Abre la comida desde tu panel principal o el feed del grupo.',
      'Toca Editar.',
      'Cambia los alimentos, el tamaño de las porciones, el tipo de comida o la fecha y hora.',
      'Guarda los cambios.',
    ],
    tips: [
      'Ajustar la porción (pequeña / mediana / grande o una cantidad) es la forma más rápida de corregir las calorías.',
      'Si la foto no detectó algún alimento, agrégalo desde la misma pantalla de edición.',
    ],
    faqs: [
      { q: '¿Editar afecta mi racha?', a: 'No, siempre que ese día siga teniendo al menos una comida registrada. Las rachas cuentan los días con al menos una comida registrada.' },
      { q: '¿Puedo mover una comida a otro día?', a: 'Sí. Edita su fecha y hora, y se moverá a los totales de ese día.' },
    ],
  },
  {
    id: 'fl-deleting',
    title: 'Eliminar comidas',
    tags: ['eliminar comida', 'borrar comida', 'deshacer registro', 'me equivoqué'],
    summary: 'Elimina una comida que registraste por error.',
    overview:
      'Si registraste algo dos veces o por accidente, puedes eliminarlo. Al eliminarlo, se quita de tus totales diarios y del feed de tu grupo.',
    steps: [
      'Abre la comida que quieres eliminar.',
      'Toca Editar o el menú de la comida.',
      'Selecciona Eliminar y confirma.',
    ],
    tips: [
      'Si una comida solo está mal registrada, en lugar de eliminarla es mejor editarla; así conservas tu racha y tu historial.',
      'Eliminar la única comida registrada en un día puede romper la racha de ese día.',
    ],
    faqs: [
      { q: '¿Puedo deshacer una eliminación?', a: 'Las eliminaciones son permanentes. Si no estás seguro, mejor edita la comida.' },
      { q: '¿Al eliminar una comida también desaparece de mi grupo?', a: 'Sí. Una vez eliminada, ya no aparece en el feed del grupo.' },
    ],
  },
  {
    id: 'fl-breakdowns',
    title: 'Entender el desglose nutricional',
    tags: ['desglose nutricional', 'información nutricional', 'calorías y macros', 'micronutrientes de una comida'],
    summary: 'Qué significan los números de una comida: calorías, macros y nutrientes.',
    overview:
      'Cada comida muestra tres niveles de información: las calorías totales, los macronutrientes (proteínas, carbohidratos, grasas, fibra) y los micronutrientes (vitaminas y minerales clave). Juntos te dicen no solo cuánto comiste, sino qué tan nutritiva fue esa comida.',
    steps: [
      'Abre cualquier comida.',
      'Mira las calorías totales en la parte superior.',
      'Revisa la distribución de macros justo debajo.',
      'Expande los nutrientes para ver las vitaminas y minerales que aportó la comida.',
    ],
    tips: [
      'Dos comidas con las mismas calorías pueden tener un valor nutricional muy distinto; el desglose te muestra cuál.',
      'Úsalo para identificar mejoras sencillas, como agregar un alimento que cubra un nutriente que sueles descuidar.',
    ],
    faqs: [
      { q: '¿Por qué algunos nutrientes aparecen en cero?', a: 'O el alimento tiene muy poco de ese nutriente, o la estimación no pudo calcularlo. Registrar una variedad de alimentos completa el panorama.' },
      { q: '¿De dónde salen los totales diarios?', a: 'Son la suma de todas las comidas que registraste ese día.' },
    ],
  },
  {
    id: 'fl-calorie-estimates',
    title: 'Entender las estimaciones de calorías',
    tags: ['estimación de calorías', 'qué tan precisas son', 'calorías por foto', 'exactitud'],
    summary: 'Por qué las calorías son estimaciones y cómo hacerlas más precisas.',
    overview:
      'Las calorías, sobre todo las calculadas por foto, son estimaciones. El tamaño de la porción, el método de cocción y los ingredientes ocultos, como el aceite, afectan el número real. NutriSync busca acercarse lo suficiente como para guiar tus decisiones diarias y mostrar tendencias semanales.',
    steps: [
      'Después de registrar, revisa el tamaño de la porción de cada alimento.',
      'Auméntala o redúcela (pequeña / mediana / grande o una cantidad) según lo que realmente comiste.',
      'Para alimentos empacados, usa el código de barras para obtener los números más exactos.',
    ],
    tips: [
      'No busques la perfección. Las estimaciones consistentes muestran tendencias aunque algún número individual no sea exacto.',
      'Los aceites y aderezos suman calorías rápido; agrégalos si la foto no los detectó.',
    ],
    faqs: [
      { q: '¿Por qué mi estimación es diferente a la del empaque?', a: 'Las estimaciones por foto se basan en lo que se ve. Para obtener los valores exactos de la etiqueta, registra el alimento por código de barras o búsqueda.' },
      { q: '¿Debería pesar mi comida?', a: 'No es necesario. Pesar los alimentos mejora la precisión, pero para la mayoría de las personas una estimación razonable de la porción es suficiente.' },
    ],
  },
  {
    id: 'fl-macros',
    title: 'Entender los macronutrientes',
    tags: ['macros', 'proteínas', 'carbohidratos', 'grasas', 'fibra'],
    summary: 'Qué son los macronutrientes y cómo usarlos.',
    overview:
      'Los macronutrientes (proteínas, carbohidratos, grasas y fibra) son los nutrientes que tu cuerpo necesita en mayor cantidad y los que conforman tus calorías. NutriSync registra los cuatro para que veas no solo cuánto comes, sino cómo se compone tu alimentación.',
    steps: [
      'Abre la pestaña Hoy para ver tu progreso de macros del día.',
      'Toca una comida para ver cuánto aportó de cada macro.',
      'Procura cumplir tus metas de proteínas y fibra de forma constante; ayudan a tus músculos y tu digestión.',
    ],
    tips: [
      'La proteína es el macro que más gente consume de menos; además te ayuda a sentirte satisfecho por más tiempo.',
      'La fibra proviene de alimentos integrales como verduras, frutas, legumbres y granos enteros.',
    ],
    faqs: [
      { q: '¿Cuál es una buena distribución de macros?', a: 'Depende de tu objetivo. Un buen punto de partida: prioriza la proteína, asegura suficiente fibra y deja que los carbohidratos y las grasas completen el resto dentro de tu meta de calorías.' },
      { q: '¿Los macros tienen que sumar exacto?', a: 'No. Úsalos como guía. Cumplir con la proteína y la fibra la mayoría de los días importa más que las proporciones exactas.' },
    ],
  },
  {
    id: 'fl-micros',
    title: 'Entender los micronutrientes',
    tags: ['micronutrientes', 'vitaminas', 'minerales', 'hierro', 'vitamina d'],
    summary: 'Las vitaminas y minerales que registra NutriSync y por qué son importantes.',
    overview:
      'Los micronutrientes son las vitaminas y minerales que tu cuerpo necesita en menor cantidad, pero sin los cuales no puede funcionar bien. NutriSync registra los diez que más suelen faltar en la alimentación de las personas: vitamina D, vitamina C, B12, hierro, calcio, magnesio, zinc, potasio, omega-3 y folato.',
    steps: [
      'Abre la pestaña Hoy y desplázate hasta tu progreso de nutrientes.',
      'Identifica qué nutrientes están en verde (dentro de la meta) y cuáles están bajos.',
      'Toca un nutriente bajo para ver alimentos ricos en él.',
      'Registra un alimento que ayude a cerrar esa brecha.',
    ],
    tips: [
      'Casi nunca necesitas suplementos para cubrir una brecha; un solo alimento bien elegido suele bastar.',
      'La variedad es la forma más fácil de cubrir todos tus nutrientes.',
    ],
    faqs: [
      { q: '¿Por qué el enfoque en estos diez?', a: 'Son las carencias más comunes y afectan la energía, el ánimo, las defensas y la salud a largo plazo, además de que responden bien a pequeños cambios en la alimentación.' },
      { q: '¿Qué significa estar "dentro de la meta"?', a: 'Un nutriente está dentro de la meta cuando tu consumo alcanza su objetivo diario. Los resúmenes semanales destacan tus nutrientes más fuertes y los más débiles.' },
    ],
  },
]
