// Water is stored canonically in millilitres in the DB, but US users think in
// fluid ounces and bottle sizes. These helpers convert for display/input.

export const ML_PER_OZ = 29.5735

export function mlToOz(ml: number): number {
  return Math.round(ml / ML_PER_OZ)
}

export function ozToMl(oz: number): number {
  return Math.round(oz * ML_PER_OZ)
}

export function formatOz(ml: number): string {
  return `${mlToOz(ml)} oz`
}

// Common US bottle/glass sizes (oz) and daily targets (oz). A custom input covers
// anything outside these presets.
export const BOTTLE_OZ_PRESETS = [16, 24, 32]
export const TARGET_OZ_PRESETS = [64, 80]
