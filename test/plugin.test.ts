/* oxlint-disable typescript/no-unsafe-type-assertion -- test doubles */
import {createSchema, type ObjectSchemaType} from 'sanity'
import {describe, expect, it} from 'vitest'

import {caliberValidation, firearmFields, type FirearmFieldsConfig} from '../src'
import {resolveConfig, toAbsolutePath} from '../src/config'

type AnyType = {
  name: string
  type: string
  fields?: {name: string; type: string}[]
  validation?: unknown
}

function typesOf(config?: FirearmFieldsConfig): AnyType[] {
  const plugin = firearmFields(config) as {name: string; schema?: {types?: unknown}}
  expect(plugin.name).toBe('sanity-plugin-firearm-fields')
  return plugin.schema?.types as AnyType[]
}

describe('firearmFields plugin', () => {
  it('adds caliber and firearmSpecs with the default fields', () => {
    const [caliber, specs] = typesOf()
    expect(caliber).toMatchObject({name: 'caliber', type: 'string'})
    expect(typeof caliber?.validation).toBe('function')
    expect(specs).toMatchObject({name: 'firearmSpecs', type: 'object'})
    expect(specs?.fields?.map((f) => f.name)).toEqual([
      'kind',
      'brand',
      'model',
      'generation',
      'caliber',
      'capacity',
      'barrelLength',
      'roundsPerBox',
      'costPerRound',
    ])
  })

  it('honors fields, typeNames and validation options', () => {
    const [caliber, specs] = typesOf({
      fields: ['calibers', 'caliber', 'brand'],
      typeNames: {caliber: 'gnpCaliber', firearmSpecs: 'gunSpecs'},
      validation: false,
    })
    expect(caliber?.name).toBe('gnpCaliber')
    expect(caliber?.validation).toBeUndefined()
    expect(specs?.name).toBe('gunSpecs')
    // Studio order, not option order; caliber fields use the renamed type
    expect(specs?.fields?.map((f) => [f.name, f.type])).toEqual([
      ['brand', 'string'],
      ['caliber', 'gnpCaliber'],
      ['calibers', 'array'],
    ])
  })

  it('rejects unknown fields', () => {
    expect(() => typesOf({fields: ['price' as never]})).toThrow(/unknown field/)
  })

  it('compiles in a Sanity schema, with per-field options', () => {
    const schema = createSchema({
      name: 'test',
      types: [
        ...typesOf({fields: ['caliber', 'calibers', 'capacity']}),
        {
          name: 'product',
          type: 'document',
          fields: [
            {name: 'name', type: 'string'},
            {name: 'specs', type: 'firearmSpecs', options: {titleField: 'name'}},
            {name: 'ammoCaliber', type: 'caliber'},
          ],
        },
      ],
    })
    expect(
      schema._validation?.flatMap((g) => g.problems).filter((p) => p.severity === 'error') ?? [],
    ).toEqual([])
    const product = schema.get('product') as ObjectSchemaType
    const specs = product.fields.find((f) => f.name === 'specs')?.type as ObjectSchemaType
    expect(specs.options).toMatchObject({titleField: 'name'})
    expect(specs.fields.map((f) => f.name)).toEqual(['caliber', 'calibers', 'capacity'])
    expect(product.fields.find((f) => f.name === 'ammoCaliber')?.type.jsonType).toBe('string')
  })
})

describe('caliberValidation', () => {
  // records the custom validators and their level, like Sanity's Rule
  function fakeRule() {
    const made: {level: string; fn: (v: unknown) => unknown}[] = []
    const rule = {
      custom(fn: (v: unknown) => unknown) {
        return {
          warning: () => (made.push({level: 'warning', fn}), rule),
          info: () => (made.push({level: 'info', fn}), rule),
        }
      },
    }
    return {rule, made}
  }

  it('warns about unknown calibers and notes other spellings', () => {
    const {rule, made} = fakeRule()
    caliberValidation(rule as never)
    const results = (v: unknown) => made.map((m) => [m.level, m.fn(v)])
    expect(results('9×19mm Parabellum')).toEqual([
      ['warning', true],
      ['info', true],
    ])
    expect(results('9mm Luger')).toEqual([
      ['warning', true],
      ['info', 'Standard name: 9×19mm Parabellum'],
    ])
    expect(results('banana')).toEqual([
      ['warning', '“banana” is not in the caliber list'],
      ['info', true],
    ])
    expect(results(undefined)).toEqual([
      ['warning', true],
      ['info', true],
    ])
  })
})

describe('config', () => {
  it('defaults links off and title to "title"', () => {
    const c = resolveConfig()
    expect(c.links).toBe(false)
    expect(c.validation).toBe(true)
    expect(c.source.titleField).toBe('title')
  })

  it('resolves field paths', () => {
    const obj = ['variants', {_key: 'a'}, 'specs']
    expect(toAbsolutePath('title', obj)).toEqual(['title'])
    expect(toAbsolutePath('store.title', obj)).toEqual(['store', 'title'])
    expect(toAbsolutePath('variants[0].title', obj)).toEqual(['variants', 0, 'title'])
    expect(toAbsolutePath('^.title', obj)).toEqual(['variants', {_key: 'a'}, 'title'])
    expect(toAbsolutePath('^.^.title', obj)).toEqual(['title'])
    expect(toAbsolutePath('^.title', ['specs'])).toEqual(['title'])
    expect(toAbsolutePath(['a', 'b'], obj)).toEqual(['a', 'b'])
  })
})
