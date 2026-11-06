import type {Path} from 'sanity'

import {ALL_SPEC_FIELDS, DEFAULT_SPEC_FIELDS, type SpecField} from './specs'

/**
 * A field path: `"title"`, `"store.title"`, `"variants[0].title"`, or `"^.title"` for a sibling of the
 * specs object (handy inside array items). Arrays of path segments are accepted too.
 * @public
 */
export type FieldPath = string | Path

/**
 * Where "Fill from title" reads from. Set them for the whole plugin, or per field with
 * `options` on a `firearmSpecs` field.
 * @public
 */
export interface FillSourceOptions {
  /** field holding the product title (default `"title"`) */
  titleField?: FieldPath
  /** optional price field: gives cost per round for ammo */
  priceField?: FieldPath
  /** optional brand / manufacturer field: helps identify the model */
  brandField?: FieldPath
  /** optional manufacturer part number field: Glock part numbers are decoded */
  mpnField?: FieldPath
}

/**
 * Plugin options.
 * @public
 */
export interface FirearmFieldsConfig extends FillSourceOptions {
  /**
   * Show a link from a caliber to its price comparison page on GunsNPrices (gunsnprices.com).
   * Off by default.
   */
  links?: boolean
  /** `firearmSpecs` fields to include; defaults to all but `family` and `calibers` */
  fields?: SpecField[]
  /** warn about caliber values that aren't in the caliber list (default `true`) */
  validation?: boolean
  /** schema type names, if `caliber` or `firearmSpecs` clash with your own types */
  typeNames?: {caliber?: string; firearmSpecs?: string}
}

/** @internal */
export interface ResolvedConfig {
  links: boolean
  fields: SpecField[]
  validation: boolean
  caliberType: string
  specsType: string
  source: Required<Pick<FillSourceOptions, 'titleField'>> & Omit<FillSourceOptions, 'titleField'>
}

/** @internal */
export function resolveConfig(config: FirearmFieldsConfig | void): ResolvedConfig {
  const c = config || {}
  const wanted = c.fields?.length ? new Set(c.fields) : new Set(DEFAULT_SPEC_FIELDS)
  const unknown = [...wanted].filter((f) => !ALL_SPEC_FIELDS.includes(f))
  if (unknown.length) {
    throw new Error(
      `sanity-plugin-firearm-fields: unknown field(s) ${unknown.join(', ')}. Valid: ${ALL_SPEC_FIELDS.join(', ')}`,
    )
  }
  return {
    links: c.links === true,
    fields: ALL_SPEC_FIELDS.filter((f) => wanted.has(f)),
    validation: c.validation !== false,
    caliberType: c.typeNames?.caliber || 'caliber',
    specsType: c.typeNames?.firearmSpecs || 'firearmSpecs',
    source: {
      titleField: c.titleField || 'title',
      priceField: c.priceField,
      brandField: c.brandField,
      mpnField: c.mpnField,
    },
  }
}

// path of the object that holds the object at `p` (an array item counts as an object)
function up(p: Path): Path {
  if (!p.length) return p
  return typeof p[p.length - 1] === 'string' ? p.slice(0, -1) : p.slice(0, -2)
}

/**
 * Turn a field path into an absolute Sanity path. Each leading `^.` goes up one object from `objectPath`.
 * @internal
 */
export function toAbsolutePath(path: FieldPath, objectPath: Path): Path {
  if (Array.isArray(path)) return path
  let rest = path.trim()
  let base: Path | null = null
  while (rest === '^' || rest.startsWith('^.')) {
    base = up(base ?? objectPath)
    rest = rest === '^' ? '' : rest.slice(2)
  }
  base = base ?? []
  const segs: Path = []
  for (const part of rest.split('.').filter(Boolean)) {
    const m = part.match(/^([^[\]]*)((?:\[\d+\])*)$/)
    if (!m) {
      segs.push(part)
      continue
    }
    if (m[1]) segs.push(m[1])
    for (const idx of m[2]?.match(/\d+/g) ?? []) segs.push(Number(idx))
  }
  return [...base, ...segs]
}

/**
 * One key of a schema type's `options`, without trusting its shape.
 * @internal
 */
export function readOption(options: unknown, key: string): unknown {
  if (typeof options !== 'object' || options === null) return undefined
  const v: unknown = Reflect.get(options, key)
  return v
}

function isFieldPath(v: unknown): v is FieldPath {
  return (typeof v === 'string' && v.trim() !== '') || Array.isArray(v)
}

/**
 * Fill source options set on a field (`options: {titleField: ...}`), keeping only valid values.
 * @internal
 */
export function readSourceOptions(options: unknown): FillSourceOptions {
  const out: FillSourceOptions = {}
  for (const key of ['titleField', 'priceField', 'brandField', 'mpnField'] as const) {
    const v = readOption(options, key)
    if (isFieldPath(v)) out[key] = v
  }
  return out
}
