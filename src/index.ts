import {definePlugin} from 'sanity'

import {resolveConfig, type FirearmFieldsConfig} from './config'
import {createCaliberType, createFirearmSpecsType} from './schemas'

/**
 * Adds the `caliber` and `firearmSpecs` schema types.
 *
 * ```ts
 * import {defineConfig} from 'sanity'
 * import {firearmFields} from 'sanity-plugin-firearm-fields'
 *
 * export default defineConfig({
 *   // ...
 *   plugins: [firearmFields()],
 * })
 * ```
 *
 * @public
 */
export const firearmFields = definePlugin<FirearmFieldsConfig | void>((config) => {
  const resolved = resolveConfig(config)
  return {
    name: 'sanity-plugin-firearm-fields',
    schema: {
      types: [createCaliberType(resolved), createFirearmSpecsType(resolved)],
    },
  }
})

export {
  CALIBER_CLASS_LABELS,
  caliberByName,
  caliberStatus,
  searchCalibers,
  type CaliberClass,
  type CaliberStatus,
  type CaliberSuggestion,
} from './calibers'
export type {CaliberFieldOptions} from './components/CaliberInput'
export type {FirearmSpecsFieldOptions} from './components/FirearmSpecsInput'
export type {FieldPath, FillSourceOptions, FirearmFieldsConfig} from './config'
export {caliberValidation} from './schemas'
export {
  ALL_SPEC_FIELDS,
  DEFAULT_SPEC_FIELDS,
  describeSpecs,
  planFill,
  specsFromTitle,
  type FillPlan,
  type FirearmSpecs,
  type SpecField,
  type SpecsSource,
} from './specs'
export type {Caliber} from 'gunsnprices'
