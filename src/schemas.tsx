import {defineField, defineType, type FieldDefinition, type StringRule} from 'sanity'

import {caliberStatus} from './calibers'
import {CaliberInput} from './components/CaliberInput'
import {FirearmSpecsInput} from './components/FirearmSpecsInput'
import type {ResolvedConfig} from './config'
import type {FirearmSpecs, SpecField} from './specs'

/**
 * Validation for caliber strings: a warning for values that aren't calibers, a note for other spellings
 * of a known caliber. Use it on your own string fields: `validation: caliberValidation`.
 * @public
 */
export function caliberValidation(rule: StringRule) {
  return [
    rule
      .custom((value) =>
        caliberStatus(value).state === 'unknown' ? `“${value}” is not in the caliber list` : true,
      )
      .warning(),
    rule
      .custom((value) => {
        const s = caliberStatus(value)
        return s.state === 'alias' ? `Standard name: ${s.caliber.name}` : true
      })
      .info(),
  ]
}

/** @internal */
export function createCaliberType(config: ResolvedConfig) {
  return defineType({
    name: config.caliberType,
    title: 'Caliber',
    type: 'string',
    components: {
      input: (props) => <CaliberInput {...props} links={config.links} />,
    },
    ...(config.validation ? {validation: caliberValidation} : {}),
  })
}

type Parent = FirearmSpecs | undefined
const ammoOnly = ({parent, value}: {parent?: Parent; value?: unknown}) =>
  parent?.kind === 'firearm' && (value === undefined || value === null)
const firearmOnly = ({parent, value}: {parent?: Parent; value?: unknown}) =>
  parent?.kind === 'ammo' && (value === undefined || value === null || value === '')

function specField(name: SpecField, config: ResolvedConfig): FieldDefinition {
  switch (name) {
    case 'kind':
      return defineField({
        name,
        title: 'Type',
        type: 'string',
        options: {
          list: [
            {title: 'Firearm', value: 'firearm'},
            {title: 'Ammunition', value: 'ammo'},
          ],
          layout: 'radio',
          direction: 'horizontal',
        },
      })
    case 'brand':
      return defineField({name, title: 'Brand', type: 'string'})
    case 'model':
      return defineField({
        name,
        title: 'Model',
        type: 'string',
        description: 'Most specific model, e.g. Glock 19 Gen 5 MOS',
        hidden: firearmOnly,
      })
    case 'family':
      return defineField({
        name,
        title: 'Model family',
        type: 'string',
        description: 'e.g. Glock 19',
        hidden: firearmOnly,
      })
    case 'generation':
      return defineField({
        name,
        title: 'Generation',
        type: 'string',
        description: 'e.g. 5 for Gen 5, V3',
        hidden: firearmOnly,
      })
    case 'caliber':
      return defineField({name, title: 'Caliber', type: config.caliberType})
    case 'calibers':
      return defineField({
        name,
        title: 'All calibers',
        type: 'array',
        description: 'Every caliber the product takes, e.g. .357 Mag and .38 S&W Special',
        of: [{type: config.caliberType}],
      })
    case 'capacity':
      return defineField({
        name,
        title: 'Magazine capacity',
        type: 'number',
        description: 'Rounds in the magazine (15 for 15+1)',
        validation: (rule) => rule.integer().min(0),
        hidden: firearmOnly,
      })
    case 'barrelLength':
      return defineField({
        name,
        title: 'Barrel length',
        type: 'number',
        description: 'Inches',
        validation: (rule) => rule.positive(),
        hidden: firearmOnly,
      })
    case 'roundsPerBox':
      return defineField({
        name,
        title: 'Rounds per box',
        type: 'number',
        validation: (rule) => rule.integer().positive(),
        hidden: ammoOnly,
      })
    case 'costPerRound':
      return defineField({
        name,
        title: 'Cost per round',
        type: 'number',
        description: 'Price ÷ rounds, in the currency of the price',
        validation: (rule) => rule.min(0),
        hidden: ammoOnly,
      })
    default:
      throw new Error(`sanity-plugin-firearm-fields: unknown field ${String(name satisfies never)}`)
  }
}

/** @internal */
export function createFirearmSpecsType(config: ResolvedConfig) {
  return defineType({
    name: config.specsType,
    title: 'Firearm specs',
    type: 'object',
    fields: config.fields.map((f) => specField(f, config)),
    components: {
      input: (props) => <FirearmSpecsInput {...props} config={config} />,
    },
    preview: {
      select: {model: 'model', brand: 'brand', caliber: 'caliber', kind: 'kind'},
      prepare: ({model, brand, caliber, kind}: Record<string, string | undefined>) => ({
        title: model || brand || caliber || 'Specs',
        subtitle: [
          kind === 'ammo' ? 'Ammo' : kind === 'firearm' ? 'Firearm' : '',
          model ? caliber : '',
        ]
          .filter(Boolean)
          .join(' · '),
      }),
    },
  })
}
