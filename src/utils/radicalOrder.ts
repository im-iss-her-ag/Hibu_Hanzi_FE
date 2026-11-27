import type { RadicalFamily } from '../core'

/** Radical families in the order the library grid shows them: grouped by stroke count (unknown last). */
export function orderRadicalFamilies(families: readonly RadicalFamily[]): RadicalFamily[] {
  return [...families].sort((a, b) => (a.info.strokeCount || 99) - (b.info.strokeCount || 99))
}
