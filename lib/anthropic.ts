import Anthropic from '@anthropic-ai/sdk'
import type { NutrientTotals, MacroTotals } from '@/types'
import { emptyTotals } from './nutrients'
import { emptyMacros } from './macros'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Parse JSON from an LLM response that may be wrapped in ```json fences or include
 * stray prose. Strips fences, then falls back to extracting the first {...} block.
 * Returns null if nothing parseable is found.
 */
function parseJsonLoose(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* fall through */ }
    }
    return null
  }
}

export interface AnalyzedFood {
  name: string
  servingSizeG: number
  confidence: 'high' | 'medium' | 'low'
  calories: number
  macros: MacroTotals
  nutrients: NutrientTotals
}

interface PhotoAnalysisResult {
  foods: AnalyzedFood[]
  rawDescription: string
}

/**
 * Single Claude Vision call: identify every food in the photo AND return complete
 * nutrition (calories, macros, micros) for the visible serving of each.
 * This is the source of truth — no external nutrition API required.
 */
export async function analyzeFoodPhoto(base64Image: string, mediaType: string): Promise<PhotoAnalysisResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp', data: base64Image },
          },
          {
            type: 'text',
            text: `You are a nutrition database with vision. Identify each distinct food item in this meal photo, estimate the visible serving size in grams, and provide complete nutrition for THAT serving.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "description": "brief natural description of the meal",
  "foods": [
    {
      "name": "specific food name (e.g. 'grilled chicken breast', not 'chicken')",
      "servingSizeG": 150,
      "confidence": "high",
      "calories": 248,
      "protein_g": 46,
      "carbs_g": 0,
      "fat_g": 5,
      "fiber_g": 0,
      "vitamin_d": 0.2,
      "vitamin_c": 0,
      "b12": 0.3,
      "iron": 1.0,
      "calcium": 15,
      "magnesium": 35,
      "zinc": 1.5,
      "potassium": 380,
      "omega3": 40,
      "folate": 6
    }
  ]
}

Rules:
- confidence: "high" = clearly identifiable + estimable portion; "medium" = portion uncertain; "low" = partially visible.
- Nutrition values are for the estimated serving size, NOT per 100g.
- Units: calories kcal; protein_g/carbs_g/fat_g/fiber_g grams; vitamin_d/b12/folate mcg; vitamin_c/iron/calcium/magnesium/zinc/potassium/omega3 mg.
- calories should roughly equal protein_g*4 + carbs_g*4 + fat_g*9.
- Use realistic USDA-approximate values. Never return all zeros for a real food.
- Do not invent foods not visible in the image.`,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const parsed = parseJsonLoose(text)
  if (!parsed) return { foods: [], rawDescription: text }

  const rawFoods = Array.isArray(parsed.foods) ? parsed.foods as Record<string, number | string>[] : []
  const foods: AnalyzedFood[] = rawFoods.map((f) => ({
    name: String(f.name ?? 'Food'),
    servingSizeG: Number(f.servingSizeG) || 100,
    confidence: (f.confidence as AnalyzedFood['confidence']) ?? 'medium',
    calories: Math.round(Number(f.calories) || 0),
    macros: { ...emptyMacros(), ...numericFields(f, ['protein_g', 'carbs_g', 'fat_g', 'fiber_g']) },
    nutrients: { ...emptyTotals(), ...numericFields(f, ['vitamin_d', 'vitamin_c', 'b12', 'iron', 'calcium', 'magnesium', 'zinc', 'potassium', 'omega3', 'folate']) },
  }))
  return { foods, rawDescription: typeof parsed.description === 'string' ? parsed.description : '' }
}

// Pull a whitelist of numeric keys out of a loosely-typed object
function numericFields(obj: Record<string, number | string>, keys: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const k of keys) {
    const v = Number(obj[k])
    if (!Number.isNaN(v)) out[k] = v
  }
  return out
}

export interface FoodEstimate {
  calories: number
  macros: MacroTotals
  nutrients: NutrientTotals
}

// Estimate calories, macros and micronutrients via Claude when USDA is unavailable or returns no data
export async function estimateFoodNutrition(
  foodName: string,
  servingG: number,
): Promise<FoodEstimate> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are a nutrition database. Estimate realistic nutrition for: "${foodName}", ${servingG}g serving.

Return ONLY valid JSON — no markdown, no explanation:
{
  "calories": 200,
  "protein_g": 15,
  "carbs_g": 20,
  "fat_g": 8,
  "fiber_g": 3,
  "vitamin_d": 1.2,
  "vitamin_c": 5,
  "b12": 0.8,
  "iron": 2.1,
  "calcium": 45,
  "magnesium": 22,
  "zinc": 1.5,
  "potassium": 280,
  "omega3": 120,
  "folate": 18
}

Units: calories in kcal; protein_g/carbs_g/fat_g/fiber_g in grams; vitamin_d/b12/folate in mcg; all other micros in mg.
Use realistic values based on typical USDA data. Calories should roughly equal protein_g*4 + carbs_g*4 + fat_g*9. Never return all zeros — estimate based on food type.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const parsed = parseJsonLoose(text)
  if (!parsed) return { calories: 0, macros: emptyMacros(), nutrients: emptyTotals() }
  return {
    calories: Math.round(Number(parsed.calories) || 0),
    macros: { ...emptyMacros(), ...numericFields(parsed as Record<string, number | string>, ['protein_g', 'carbs_g', 'fat_g', 'fiber_g']) },
    nutrients: { ...emptyTotals(), ...numericFields(parsed as Record<string, number | string>, ['vitamin_d', 'vitamin_c', 'b12', 'iron', 'calcium', 'magnesium', 'zinc', 'potassium', 'omega3', 'folate']) },
  }
}

// Kept for backward compatibility
export async function estimateNutrientsFromDescription(
  foodName: string,
  servingG: number,
): Promise<NutrientTotals> {
  const result = await estimateFoodNutrition(foodName, servingG)
  return result.nutrients
}
