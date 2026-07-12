import { describe, it, expect } from 'vitest'
import { rankFoods, rankMeals, normalizeName, type QuickLogSourceRow } from '@/lib/quick-log'
import type { FoodEntry, MealType } from '@/types'

// Minimal FoodEntry factory — nutrition values don't affect ranking.
function food(name: string, calories = 100, servingSizeG = 100): FoodEntry {
  return {
    fdcId: '',
    name,
    servingSizeG,
    calories,
    macros: { protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
    nutrients: {
      vitamin_d: 0, vitamin_c: 0, b12: 0, iron: 0, calcium: 0,
      magnesium: 0, zinc: 0, potassium: 0, omega3: 0, folate: 0,
    },
  }
}

const NOW = new Date('2026-07-12T12:00:00Z')

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 86_400_000).toISOString()
}

function row(mealType: MealType, loggedDaysAgo: number, foods: FoodEntry[]): QuickLogSourceRow {
  return { meal_type: mealType, logged_at: daysAgo(loggedDaysAgo), foods }
}

describe('normalizeName', () => {
  it('lowercases, trims, and collapses whitespace', () => {
    expect(normalizeName('  Boiled   Egg ')).toBe('boiled egg')
  })
})

describe('rankFoods', () => {
  it('returns empty for empty history', () => {
    expect(rankFoods([], 'breakfast', NOW)).toEqual([])
  })

  it('ranks more frequent foods higher', () => {
    const rows = [
      row('breakfast', 1, [food('Oatmeal')]),
      row('breakfast', 2, [food('Oatmeal')]),
      row('breakfast', 3, [food('Oatmeal')]),
      row('breakfast', 1, [food('Toast')]),
    ]
    const ranked = rankFoods(rows, 'breakfast', NOW)
    expect(ranked[0].entry.name).toBe('Oatmeal')
    expect(ranked[0].timesLogged).toBe(3)
  })

  it('decays foods not logged recently', () => {
    const rows = [
      // Old habit: 3× but 50+ days ago
      row('breakfast', 50, [food('Pancakes')]),
      row('breakfast', 52, [food('Pancakes')]),
      row('breakfast', 55, [food('Pancakes')]),
      // New habit: 2× this week
      row('breakfast', 1, [food('Greek yogurt')]),
      row('breakfast', 3, [food('Greek yogurt')]),
    ]
    const ranked = rankFoods(rows, 'breakfast', NOW)
    expect(ranked[0].entry.name).toBe('Greek yogurt')
  })

  it('only considers foods logged at the requested meal type', () => {
    const rows = [
      // Rice: 2× at dinner
      row('dinner', 1, [food('Rice')]),
      row('dinner', 2, [food('Rice')]),
      // Eggs: 2× at breakfast
      row('breakfast', 1, [food('Eggs')]),
      row('breakfast', 2, [food('Eggs')]),
    ]
    expect(rankFoods(rows, 'breakfast', NOW)[0].entry.name).toBe('Eggs')
    expect(rankFoods(rows, 'dinner', NOW)[0].entry.name).toBe('Rice')
  })

  it('excludes foods never logged at the requested meal type — no cross-meal blending', () => {
    const rows = [
      row('dinner', 1, [food('Steak')]),
      row('dinner', 2, [food('Steak')]),
      row('dinner', 3, [food('Steak')]),
    ]
    // Steak has real dinner history but none at snack — snack suggestions
    // shouldn't surface it just because it's frequent at another meal.
    expect(rankFoods(rows, 'snack', NOW)).toEqual([])
  })

  it('dedupes by normalized name and keeps the most recent portion', () => {
    const rows = [
      row('lunch', 5, [food('chicken breast', 200, 120)]),
      row('lunch', 1, [food('Chicken Breast', 250, 150)]),
    ]
    const ranked = rankFoods(rows, 'lunch', NOW)
    expect(ranked).toHaveLength(1)
    expect(ranked[0].timesLogged).toBe(2)
    expect(ranked[0].entry.servingSizeG).toBe(150) // most recent portion wins
  })

  it('caps results at the max', () => {
    const rows = Array.from({ length: 12 }, (_, i) => row('snack', 1, [food(`Food ${i}`)]))
    expect(rankFoods(rows, 'snack', NOW).length).toBeLessThanOrEqual(8)
  })
})

describe('rankMeals', () => {
  it('requires a meal combo to repeat before suggesting it', () => {
    const rows = [
      row('dinner', 1, [food('Salmon'), food('Rice')]), // once — not a habit
      row('dinner', 2, [food('Pasta')]),
      row('dinner', 4, [food('Pasta')]),
    ]
    const ranked = rankMeals(rows, 'dinner', NOW)
    expect(ranked).toHaveLength(1)
    expect(ranked[0].names).toEqual(['Pasta'])
    expect(ranked[0].timesLogged).toBe(2)
  })

  it('matches combos order-independently', () => {
    const rows = [
      row('breakfast', 1, [food('Egg'), food('Toast')]),
      row('breakfast', 3, [food('Toast'), food('Egg')]),
    ]
    const ranked = rankMeals(rows, 'breakfast', NOW)
    expect(ranked).toHaveLength(1)
    expect(ranked[0].timesLogged).toBe(2)
  })

  it('only considers the requested meal type and sums calories', () => {
    const rows = [
      row('lunch', 1, [food('Egg', 78), food('Bread', 91)]),
      row('lunch', 2, [food('Egg', 78), food('Bread', 91)]),
      row('dinner', 1, [food('Egg', 78), food('Bread', 91)]),
    ]
    const lunch = rankMeals(rows, 'lunch', NOW)
    expect(lunch).toHaveLength(1)
    expect(lunch[0].totalCalories).toBe(169)
    expect(lunch[0].timesLogged).toBe(2) // the dinner instance doesn't count
  })

  it('returns empty for empty history', () => {
    expect(rankMeals([], 'breakfast', NOW)).toEqual([])
  })
})
