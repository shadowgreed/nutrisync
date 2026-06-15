export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type PrivacyMode = 'meal_photos' | 'summary' | 'full' | 'dark'
export type NutrientStatus = 'green' | 'yellow' | 'red'
export type Goal = 'lose_weight' | 'maintain' | 'build_muscle' | 'improve_health'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export interface NutrientTotals {
  vitamin_d: number   // mcg
  vitamin_c: number   // mg
  b12: number         // mcg
  iron: number        // mg
  calcium: number     // mg
  magnesium: number   // mg
  zinc: number        // mg
  potassium: number   // mg
  omega3: number      // mg
  folate: number      // mcg
}

export type NutrientKey = keyof NutrientTotals

export interface MacroTotals {
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

export type MacroKey = keyof MacroTotals

export interface FoodEntry {
  fdcId: string
  name: string
  servingSizeG: number
  calories: number
  macros: MacroTotals
  nutrients: NutrientTotals
  // Portion model (optional; set when logging). baseServingG is one standard
  // serving in grams; the logged amount = baseServingG * sizeFactor * quantity.
  baseServingG?: number
  sizeFactor?: number   // 0.5 = small, 1 = medium, 1.5 = large
  quantity?: number     // number of servings
}

export interface FoodLog {
  id: string
  user_id: string
  meal_type: MealType
  logged_at: string
  photo_url: string | null
  photo_urls?: string[] | null
  foods: FoodEntry[]
  nutrient_totals: NutrientTotals
  macro_totals: MacroTotals
  total_calories: number
  privacy_override: PrivacyMode | null
  caption: string | null
}

export interface MacroTargets {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  privacy_mode: PrivacyMode
  dark_mode_until: string | null
  weight_kg: number | null
  target_weight_kg: number | null
  height_cm: number | null
  birth_year: number | null
  biological_sex: 'male' | 'female' | 'prefer_not_to_say' | null
  goal: Goal | null
  goals: Goal[] | null
  activity_level: ActivityLevel | null
  calorie_target: number | null
  onboarding_done: boolean
  water_bottle_ml: number | null
  water_daily_target_ml: number | null
  coach_visible: boolean
  coach_style: string | null
}

export type GroupRole = 'coach' | 'member'
export type GroupPlan = 'free' | 'coach'

export interface Group {
  id: string
  name: string
  created_by: string
  invite_code: string
  created_at: string
  plan: GroupPlan
  member_cap: number
}

export interface GroupMember {
  group_id: string
  user_id: string
  joined_at: string
  role: GroupRole
  profile: Profile
}

export interface Reaction {
  id: string
  user_id: string
  food_log_id: string | null
  activity_log_id?: string | null
  emoji: string
}

export interface Comment {
  id: string
  user_id: string
  food_log_id: string | null
  activity_log_id?: string | null
  text: string
  created_at: string
  parent_id?: string | null
  profile: Profile
}

export interface FeedEntry extends FoodLog {
  profile: Profile
  reactions: Reaction[]
  comments: Comment[]
}

export interface FeedActivityEntry {
  id: string
  user_id: string
  activity_name: string
  duration_minutes: number | null
  distance_km: number | null
  steps: number | null
  calories_burned: number
  logged_at: string
  profile: { id: string; display_name: string; avatar_url: string | null; privacy_mode: string; dark_mode_until: string | null }
  reactions: Reaction[]
  comments: Comment[]
}

export interface FeedMilestoneEntry {
  id: string
  user_id: string
  type: 'streak' | 'goal_weight'
  data: Record<string, unknown>
  created_at: string
  profile: { id: string; display_name: string; avatar_url: string | null; privacy_mode: string; dark_mode_until: string | null }
}

export interface ActivityLog {
  id: string
  user_id: string
  activity_name: string
  duration_minutes: number
  calories_burned: number
  logged_at: string
}

export type NotificationType = 'reaction' | 'comment' | 'challenge' | 'group_join' | 'meal' | 'weekly_report' | 'cheer' | 'join_request' | 'reply' | 'coach_message' | 'coach_nudge'

export interface AppNotification {
  id: string
  user_id: string
  actor_id: string | null
  type: NotificationType
  food_log_id: string | null
  challenge_id: string | null
  data: Record<string, unknown>
  read: boolean
  created_at: string
  actor?: { display_name: string | null } | null
}

export interface USDAFood {
  fdcId: number
  description: string
  foodNutrients: Array<{
    nutrientId: number
    nutrientName: string
    value: number
    unitName: string
  }>
  servingSize?: number
  servingSizeUnit?: string
}

export interface FoodFix {
  name: string
  serving: string
  pctGapClosed: number
}

export interface GapCorrection {
  nutrient: NutrientKey
  label: string
  unit: string
  current: number
  target: number
  pctMet: number
  status: NutrientStatus
  fixes: FoodFix[]
}
