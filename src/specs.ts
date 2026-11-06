import {costPerRound, parseTitle} from 'gunsnprices'

/**
 * Fields of the `firearmSpecs` object, in the order they appear in the Studio.
 * @public
 */
export type SpecField =
  | 'kind'
  | 'brand'
  | 'model'
  | 'family'
  | 'generation'
  | 'caliber'
  | 'calibers'
  | 'capacity'
  | 'barrelLength'
  | 'roundsPerBox'
  | 'costPerRound'

/**
 * Every field, in Studio order.
 * @public
 */
export const ALL_SPEC_FIELDS: readonly SpecField[] = [
  'kind',
  'brand',
  'model',
  'family',
  'generation',
  'caliber',
  'calibers',
  'capacity',
  'barrelLength',
  'roundsPerBox',
  'costPerRound',
]

/** @internal */
export function isSpecField(v: unknown): v is SpecField {
  return typeof v === 'string' && (ALL_SPEC_FIELDS as readonly string[]).includes(v)
}

/**
 * Fields enabled when the `fields` option is not set (`family` and `calibers` are opt-in).
 * @public
 */
export const DEFAULT_SPEC_FIELDS: readonly SpecField[] = ALL_SPEC_FIELDS.filter(
  (f) => f !== 'family' && f !== 'calibers',
)

/**
 * Value of a `firearmSpecs` field, as stored in the document.
 * @public
 */
export interface FirearmSpecs {
  _type?: string
  kind?: 'firearm' | 'ammo'
  brand?: string
  /** most specific model, e.g. "Glock 19 Gen 5 MOS" */
  model?: string
  /** model family, e.g. "Glock 19" */
  family?: string
  /** "5", "V", "V3" ... */
  generation?: string
  /** standard caliber name, e.g. "9×19mm Parabellum" */
  caliber?: string
  /** every caliber in the title */
  calibers?: string[]
  /** magazine capacity, firearms */
  capacity?: number
  /** inches, firearms */
  barrelLength?: number
  /** ammo */
  roundsPerBox?: number
  /** ammo, in the currency of the price */
  costPerRound?: number
}

/**
 * Extra facts that help the parser.
 * @public
 */
export interface SpecsSource {
  /** listing price; with rounds per box it gives cost per round */
  price?: number
  /** manufacturer, if your document has it */
  brand?: string
  /** manufacturer part number (Glock part numbers are decoded) */
  mpn?: string
}

/**
 * Read specs from a product title with the `gunsnprices` parser. Only fields found in the title are returned.
 * @public
 */
export function specsFromTitle(title: string, source: SpecsSource = {}): FirearmSpecs {
  const opts: {price?: number; brand?: string; mpn?: string} = {}
  if (typeof source.price === 'number' && source.price > 0) opts.price = source.price
  if (source.brand) opts.brand = source.brand
  if (source.mpn) opts.mpn = source.mpn
  const info = parseTitle(title || '', opts)
  const out: FirearmSpecs = {kind: info.kind}
  const brand = info.model?.brand || info.brand
  if (brand) out.brand = brand
  if (info.model) {
    if (info.model.model) out.model = info.model.model
    if (info.model.family) out.family = info.model.family
    if (info.model.generation) out.generation = info.model.generation
  }
  if (info.caliber) out.caliber = info.caliber.name
  if (info.calibers.length) out.calibers = info.calibers.map((c) => c.name)
  if (info.capacity != null) out.capacity = info.capacity
  if (info.barrelLength != null) out.barrelLength = info.barrelLength
  if (info.rounds != null) out.roundsPerBox = info.rounds
  if (info.costPerRound != null) out.costPerRound = info.costPerRound
  // the firearm/ammo guess alone is not worth writing
  return Object.keys(out).length > 1 ? out : {}
}

/** @internal */
export function isEmptyValue(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
}

function same(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => x === b[i])
  return a === b
}

/**
 * What "Fill from title" would change.
 * @public
 */
export interface FillPlan {
  /** values to write */
  set: FirearmSpecs
  /** fields that already hold a different value and are kept (mode `empty`) */
  kept: SpecField[]
}

/**
 * Plan a fill: `empty` writes only empty fields, `all` overwrites every field the title gives.
 * Cost per round is also computed from a price and the rounds per box already in the form.
 * @public
 */
export function planFill(
  current: FirearmSpecs | undefined,
  parsed: FirearmSpecs,
  fields: readonly SpecField[],
  mode: 'empty' | 'all',
  price?: number,
): FillPlan {
  const cur: FirearmSpecs = current ?? {}
  const next: FirearmSpecs = {...parsed}
  if (next.costPerRound == null && typeof price === 'number' && price > 0) {
    const rounds = next.roundsPerBox ?? cur.roundsPerBox
    const cpr = rounds ? costPerRound(price, rounds) : null
    if (cpr != null) next.costPerRound = cpr
  }
  const set: Record<string, unknown> = {}
  const kept: SpecField[] = []
  for (const f of fields) {
    const v = next[f]
    if (isEmptyValue(v) || same(v, cur[f])) continue
    if (mode === 'empty' && !isEmptyValue(cur[f])) kept.push(f)
    else set[f] = v
  }
  return {set, kept}
}

const KIND_LABEL = {firearm: 'Firearm', ammo: 'Ammo'} as const

/**
 * One-line summary of parsed specs, for previews.
 * @public
 */
export function describeSpecs(
  s: FirearmSpecs,
  fields: readonly SpecField[] = ALL_SPEC_FIELDS,
): string {
  const on = new Set(fields)
  const parts: string[] = []
  if (on.has('kind') && s.kind) parts.push(KIND_LABEL[s.kind])
  if (on.has('model') && s.model) parts.push(s.model)
  else if (on.has('family') && s.family) parts.push(s.family)
  else if (on.has('brand') && s.brand) parts.push(s.brand)
  if (on.has('calibers') && s.calibers?.length) parts.push(s.calibers.join(' / '))
  else if (on.has('caliber') && s.caliber) parts.push(s.caliber)
  if (on.has('capacity') && s.capacity != null) parts.push(`${s.capacity} rd mag`)
  if (on.has('barrelLength') && s.barrelLength != null) parts.push(`${s.barrelLength}" barrel`)
  if (on.has('roundsPerBox') && s.roundsPerBox != null) parts.push(`${s.roundsPerBox} rounds`)
  if (on.has('costPerRound') && s.costPerRound != null)
    parts.push(`${s.costPerRound.toFixed(2)}/rd`)
  return parts.join(' · ')
}
