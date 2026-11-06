import {findCalibers, listCalibers, normalizeCaliber, type Caliber} from 'gunsnprices'

import {POPULARITY} from './popularity'

/**
 * Caliber class as returned by the parser.
 * @public
 */
export type CaliberClass = Caliber['type']

/**
 * Human labels for caliber classes.
 * @public
 */
export const CALIBER_CLASS_LABELS: Record<CaliberClass, string> = {
  handgun: 'Handgun',
  rifle: 'Rifle',
  rimfire: 'Rimfire',
  shotgun: 'Shotgun',
  airgun: 'Airgun',
  muzzleloader: 'Muzzleloader',
}

// how many listings each caliber has on GunsNPrices, as an order; breaks ties and fills the empty-query list
const RANK = new Map(POPULARITY.map((id, i) => [id, i]))

/**
 * One autocomplete suggestion.
 * @public
 */
export interface CaliberSuggestion {
  caliber: Caliber
  /** `alias` when the query is another spelling of this caliber ("9mm luger"), `name` when it matches the name */
  match: 'alias' | 'name'
}

function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/[×х]/g, 'x')
    .replace(/[″”]/g, '"')
}

function words(s: string): string[] {
  return fold(s)
    .split(/[\s\-/()]+/)
    .map((w) => w.replace(/^\.+|[.,;:]+$/g, ''))
    .filter(Boolean)
}

function compact(s: string): string {
  return fold(s).replace(/[^a-z0-9]/g, '')
}

let byName: Map<string, Caliber> | null = null
let all: Caliber[] | null = null

function calibers(): Caliber[] {
  if (!all) all = listCalibers()
  return all
}

/**
 * The caliber with exactly this display name ("9×19mm Parabellum"), or null.
 * @public
 */
export function caliberByName(name: string): Caliber | null {
  if (!byName) byName = new Map(calibers().map((c) => [c.name, c]))
  return byName.get(name.trim()) ?? null
}

// keeps the decimal point, so "5.7" doesn't match inside ".357"
function compactDots(s: string): string {
  return fold(s)
    .replace(/[^a-z0-9.]/g, '')
    .replace(/^\.+/, '')
}

function scoreName(c: Caliber, qWords: string[], qCompact: string, qDots: string): number {
  const nWords = words(c.name)
  const nCompact = compact(c.name)
  if (nCompact === qCompact) return 0
  const used = new Set<number>()
  const allPrefix = qWords.every((q) => {
    const i = nWords.findIndex(
      (w, k) => !used.has(k) && (w.startsWith(q) || compact(w).startsWith(compact(q))),
    )
    if (i < 0) return false
    used.add(i)
    return true
  })
  if (allPrefix) return compact(nWords[0] ?? '').startsWith(compact(qWords[0] ?? '')) ? 1 : 2
  if (qCompact.length < 2) return -1
  // "556" → 5.56×45mm, "4570" → .45-70: digits typed without the punctuation, from the start of a word
  if (nCompact.startsWith(qCompact) || nWords.some((w) => compact(w).startsWith(qCompact))) return 3
  // inside a name only with a letter or a decimal point in the query ("bellum", "5.7"), not bare digits
  if (/[a-z.]/.test(qDots) && compactDots(c.name).includes(qDots)) return 3
  return -1
}

/**
 * Calibers matching what the user typed: other spellings ("9mm luger", "300 blk", "12ga") first, then
 * name matches, most listed calibers first. An empty query returns the most listed calibers.
 * @public
 */
export function searchCalibers(query: string, limit = 12): CaliberSuggestion[] {
  const q = (query ?? '').trim()
  if (!q) {
    return calibers()
      .filter((c) => RANK.has(c.id))
      .sort((a, b) => (RANK.get(a.id) ?? 0) - (RANK.get(b.id) ?? 0))
      .slice(0, limit)
      .map((caliber) => ({caliber, match: 'name' as const}))
  }

  const scored = new Map<string, {caliber: Caliber; score: number; match: 'alias' | 'name'}>()
  const add = (caliber: Caliber, score: number, match: 'alias' | 'name') => {
    const prev = scored.get(caliber.id)
    if (!prev || score < prev.score) scored.set(caliber.id, {caliber, score, match})
  }

  const qWords = words(q)
  const qCompact = compact(q)
  const qDots = compactDots(q)
  for (const c of calibers()) {
    const s = scoreName(c, qWords, qCompact, qDots)
    if (s >= 0) add(c, s, 'name')
  }
  // the parser knows thousands of spellings; a whole-query hit goes to the top
  const alias = normalizeCaliber(q)
  if (alias)
    add(
      alias,
      compact(alias.name) === qCompact ? -2 : -1,
      compact(alias.name) === qCompact ? 'name' : 'alias',
    )
  for (const c of findCalibers(q)) add(c, 0.5, 'alias')

  return [...scored.values()]
    .sort(
      (a, b) =>
        a.score - b.score ||
        (RANK.get(a.caliber.id) ?? RANK.size) - (RANK.get(b.caliber.id) ?? RANK.size) ||
        a.caliber.name.length - b.caliber.name.length ||
        a.caliber.name.localeCompare(b.caliber.name),
    )
    .slice(0, limit)
    .map(({caliber, match}) => ({caliber, match}))
}

/**
 * What a stored caliber value is: `standard` (an exact caliber name), `alias` (another spelling of a known
 * caliber, `caliber` is the standard one), `unknown`, or `empty`.
 * @public
 */
export type CaliberStatus =
  | {state: 'empty'}
  | {state: 'standard'; caliber: Caliber}
  | {state: 'alias'; caliber: Caliber}
  | {state: 'unknown'}

/**
 * Check a stored caliber value against the caliber list.
 * @public
 */
export function caliberStatus(value: unknown): CaliberStatus {
  if (typeof value !== 'string' || !value.trim()) return {state: 'empty'}
  const exact = caliberByName(value)
  if (exact) return {state: 'standard', caliber: exact}
  const found = normalizeCaliber(value)
  return found ? {state: 'alias', caliber: found} : {state: 'unknown'}
}
