import type { HelpCategory, CategoryId } from './types'
import type { Locale } from '@/lib/i18n'

// The eight Help Center sections, in display order.
export const CATEGORIES: HelpCategory[] = [
  { id: 'getting-started', title: 'Getting Started', emoji: '🚀', description: 'New here? Start with the basics.' },
  { id: 'food-logging', title: 'Food Logging', emoji: '🍽️', description: 'Log meals, photos, macros and nutrients.' },
  { id: 'activity', title: 'Activity Tracking', emoji: '🏃', description: 'Workouts, steps, distance and calorie burn.' },
  { id: 'groups', title: 'Groups', emoji: '👥', description: 'Create groups, invite friends, stay accountable.' },
  { id: 'challenges', title: 'Challenges', emoji: '🏆', description: 'Run challenges and friendly competition.' },
  { id: 'progress', title: 'Progress & Trends', emoji: '📈', description: 'Streaks, weight trends and weekly recaps.' },
  { id: 'account', title: 'Account & Billing', emoji: '⚙️', description: 'Profile, notifications and subscription.' },
  { id: 'troubleshooting', title: 'Troubleshooting', emoji: '🛠️', description: 'Fix problems and answer "why did that happen?"' },
]

// Spanish (es-419) title/description overlay, keyed by the same stable `id`s.
const CATEGORIES_ES: Record<CategoryId, { title: string; description: string }> = {
  'getting-started': { title: 'Primeros pasos', description: '¿Nuevo por aquí? Empieza por lo básico.' },
  'food-logging': { title: 'Registro de comidas', description: 'Registra comidas, fotos, macros y nutrientes.' },
  'activity': { title: 'Seguimiento de actividad', description: 'Entrenamientos, pasos, distancia y calorías quemadas.' },
  'groups': { title: 'Grupos', description: 'Crea grupos, invita amigos y mantente motivado en conjunto.' },
  'challenges': { title: 'Desafíos', description: 'Organiza desafíos y sana competencia entre amigos.' },
  'progress': { title: 'Progreso y tendencias', description: 'Rachas, tendencias de peso y resúmenes semanales.' },
  'account': { title: 'Cuenta y facturación', description: 'Perfil, notificaciones y suscripción.' },
  'troubleshooting': { title: 'Solución de problemas', description: 'Resuelve problemas y responde "¿por qué pasó eso?"' },
}

const BY_ID: Record<string, HelpCategory> = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

export function getCategory(id: CategoryId, locale: Locale = 'en'): HelpCategory {
  const base = BY_ID[id]
  if (locale !== 'es') return base
  const es = CATEGORIES_ES[id]
  return { ...base, title: es.title, description: es.description }
}

/** All eight categories, localized. */
export function localizedCategories(locale: Locale = 'en'): HelpCategory[] {
  return CATEGORIES.map(c => getCategory(c.id, locale))
}
