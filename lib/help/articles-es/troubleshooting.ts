import type { ArticleTranslation } from '../types'

export const troubleshootingEs: ArticleTranslation[] = [
  {
    id: 'ts-upload',
    title: 'Problemas al subir fotos',
    tags: ['subir foto', 'la foto no carga', 'se queda pegada', 'falló la subida', 'imagen'],
    summary: 'Qué hacer cuando la foto de una comida no se sube.',
    overview:
      'Para analizar una foto de comida, la app necesita conexión a internet. Si una subida se queda pegada o falla, casi siempre se debe a un problema de conexión o a una imagen muy pesada. Unos pocos pasos suelen resolverlo.',
    steps: [
      'Verifica que tengas una conexión a internet estable.',
      'Inténtalo de nuevo — vuelve a tomar o seleccionar la foto.',
      'Si sigue fallando, cierra y vuelve a abrir la app.',
      'Como alternativa, registra la comida por búsqueda o código de barras y agrega la foto más tarde.',
    ],
    tips: [
      'Una foto nítida y de tamaño normal se sube más rápido que una muy pesada.',
      'Si tu conexión es débil, cambia a Wi-Fi antes de registrar con foto.',
    ],
    faqs: [
      { q: 'Mi foto se quedó en "procesando" — ¿qué hago?', a: 'Espera un momento y vuelve a intentarlo. Si no termina, registra la comida por búsqueda y agrega la foto después.' },
      { q: '¿Voy a perder la comida si falla la subida?', a: 'No — vuelve a registrarla cuando tengas conexión. Nada se guarda hasta que la subida se completa con éxito.' },
    ],
  },
  {
    id: 'ts-missing',
    title: 'Comidas que no aparecen',
    tags: ['comida perdida', 'desapareció', 'no aparece', 'registro perdido', 'no se ve'],
    summary: 'Por qué una comida podría no aparecer y cómo encontrarla.',
    overview:
      'Cuando una comida "desaparece", normalmente está en un día distinto al que esperabas, no terminó de guardarse o quedó fuera del día que estás viendo. Así puedes ubicarla.',
    steps: [
      'Confirma qué día estás viendo — las comidas se agrupan según el día local en que se registraron.',
      'Revisa la fecha y hora de la comida si la registraste muy tarde en la noche o muy temprano.',
      'Si falló la subida de una foto, es posible que la comida no se haya guardado — regístrala de nuevo.',
      'Desliza para actualizar, o vuelve a abrir la app, para sincronizar.',
    ],
    tips: [
      'Las comidas registradas de madrugada pueden aparecer en el día anterior o siguiente según la hora — edita la hora para moverla.',
      'Si estabas sin conexión al registrar, es posible que el guardado no se haya completado.',
    ],
    faqs: [
      { q: 'Mi comida estaba ahí y ahora no aparece — ¿por qué?', a: 'Revisa si la eliminaste o si estás viendo un día distinto. Editar la hora también puede mover una comida a otro día.' },
      { q: '¿Una comida perdida afecta mi racha?', a: 'Un día sin ninguna comida guardada no cuenta. Vuelve a registrarla en el día correcto para recuperarla.' },
    ],
  },
  {
    id: 'ts-incorrect-calories',
    title: 'Calorías incorrectas',
    tags: ['calorías mal calculadas', 'inexacto', 'muy alto', 'muy bajo', 'corregir calorías'],
    summary: 'Cómo corregir un cálculo de calorías que parece incorrecto.',
    overview:
      'Los cálculos de calorías, sobre todo a partir de fotos, dependen del tamaño de la porción y de ingredientes que no se ven a simple vista. Si un número no cuadra, una edición rápida lo soluciona — y hace más precisos los días siguientes también.',
    steps: [
      'Abre la comida y toca Editar.',
      'Ajusta el tamaño de la porción (pequeña / mediana / grande o una cantidad) para que coincida con lo que comiste.',
      'Agrega lo que el cálculo no haya detectado, como aceite, aderezo o un acompañamiento.',
      'Para alimentos empaquetados, vuelve a registrar por código de barras para obtener los valores exactos de la etiqueta.',
    ],
    tips: [
      'Los aceites y las salsas suelen ser la razón detrás de cálculos "demasiado bajos".',
      'Una porción calculada un tamaño de más o de menos suele explicar por qué un número se ve alto o bajo.',
    ],
    faqs: [
      { q: '¿Por qué la foto no coincide con el empaque?', a: 'Las fotos calculan a partir de lo que se ve. Para números exactos, registra el producto por código de barras o búsqueda.' },
      { q: '¿Necesito que sea exacto?', a: 'No. Apunta a que sea cercano. Cálculos consistentes igual revelan tendencias semanales precisas.' },
    ],
  },
  {
    id: 'ts-challenge-progress',
    title: 'Problemas con el progreso de un desafío',
    tags: ['el desafío no se actualiza', 'la racha no se actualiza', 'progreso incorrecto', 'no contó', 'no sumó'],
    summary: 'Por qué un día de racha o desafío podría no haber contado.',
    overview:
      'El progreso se calcula a partir de lo que registras, así que casi todos los casos de "no contó" se deben al tipo de registro, al día en que quedó guardado, o a que no se alcanzó un umbral. Aquí puedes revisarlo.',
    steps: [
      'Confirma que registraste el tipo de actividad correcto para el desafío — un desafío de Agua necesita agua, uno de Días activos necesita una actividad.',
      'Verifica que el registro quedó en el día local correcto (los registros de madrugada pueden cambiar de día).',
      'Para desafíos con umbral (proteínas, agua), confirma que realmente alcanzaste la meta diaria.',
      'Vuelve a abrir el desafío para actualizarlo y que tu progreso refleje el registro.',
    ],
    tips: [
      'Las rachas y los desafíos cuentan días, no cantidad de registros — registrar dos veces en un día no suma dos.',
      'Existe un margen de gracia para que la racha de hoy no se vea rota antes de que hayas registrado algo.',
    ],
    faqs: [
      { q: '¿Por qué no aumentó mi racha?', a: 'Aumenta una vez por cada día que registras algo. Registrar varias comidas en un mismo día sigue contando como un solo día. Si un día parece faltante, revisa la fecha de la comida.' },
      { q: 'Mi día de desafío no contó — ¿por qué?', a: 'Puede ser que el tipo de registro no coincidiera con el desafío, que haya quedado en un día distinto, o que no se alcanzara el umbral diario.' },
    ],
  },
  {
    id: 'ts-login',
    title: 'Problemas para iniciar sesión',
    tags: ['iniciar sesión', 'no puedo entrar', 'contraseña', 'no puedo iniciar sesión', 'cuenta bloqueada', 'restablecer contraseña'],
    summary: 'Soluciones para problemas al iniciar sesión.',
    overview:
      'La mayoría de los problemas para iniciar sesión se deben a un correo mal escrito, una contraseña desactualizada o un problema de conexión. Sigue estos pasos para volver a entrar.',
    steps: [
      'Revisa bien tu correo por si hay errores de escritura y confirma tu conexión.',
      'Usa "Olvidé mi contraseña" para restablecerla si no estás seguro.',
      'Asegúrate de usar el mismo método de inicio de sesión con el que te registraste.',
      'Actualiza a la última versión de la app y vuelve a intentarlo.',
    ],
    tips: [
      'Los enlaces para restablecer la contraseña pueden llegar a spam — revisa ahí si no ves el correo.',
      'Si te registraste con un proveedor (como un inicio de sesión social), usa ese mismo botón para entrar.',
    ],
    faqs: [
      { q: 'No me llegó el correo para restablecer la contraseña — ¿qué hago?', a: 'Revisa spam, confirma que sea el correo con el que te registraste, y solicítalo de nuevo después de un minuto.' },
      { q: 'Dice que mi cuenta no existe.', a: 'Puede que estés usando un correo o método de inicio de sesión distinto al que usaste para registrarte. Prueba con los otros, o contacta a soporte.' },
    ],
  },
  {
    id: 'ts-notifications',
    title: 'Problemas con las notificaciones',
    tags: ['sin notificaciones', 'las notificaciones no funcionan', 'no me llegan avisos', 'alertas desactivadas'],
    summary: 'Qué revisar cuando las notificaciones no te llegan.',
    overview:
      'Las notificaciones push deben estar permitidas en dos lugares: dentro de NutriSync y en la configuración del sistema de tu dispositivo. Si no te llegan porras, alertas de desafíos o recordatorios, casi siempre alguno de los dos está desactivado.',
    steps: [
      'Abre Configuración → Notificaciones en NutriSync y activa los tipos que quieras recibir.',
      'Activa las notificaciones push cuando se te solicite.',
      'Revisa la configuración del sistema de tu dispositivo y permite las notificaciones para NutriSync.',
      'Vuelve a abrir la app para que se registre correctamente para recibir push.',
    ],
    tips: [
      'Si antes rechazaste el permiso, puede que debas activarlo desde la configuración del sistema de tu dispositivo.',
      'Los modos de ahorro de batería o "no molestar" pueden silenciar las notificaciones — revisa eso también.',
    ],
    faqs: [
      { q: 'Activé todo pero no me llega nada.', a: 'Confirma que las notificaciones estén permitidas para NutriSync en la configuración de tu dispositivo, desactiva cualquier modo de enfoque o ahorro de batería, y vuelve a abrir la app.' },
      { q: '¿Las notificaciones funcionan en segundo plano?', a: 'Sí, una vez que el push esté activado tanto en la app como en tu dispositivo. Volver a abrir la app una vez ayuda a que se registre.' },
    ],
  },
]
