import {describe, expect, it} from 'vitest'

import {ALL_SPEC_FIELDS, DEFAULT_SPEC_FIELDS, describeSpecs, planFill, specsFromTitle} from '../src'

const GLOCK = 'Glock 19 Gen 5 MOS 9mm 4.02" 15rd Pistol'
const AMMO = 'Federal American Eagle 9mm Luger 115gr FMJ 50 Rounds'

describe('specsFromTitle', () => {
  it('reads a firearm title', () => {
    expect(specsFromTitle(GLOCK)).toEqual({
      kind: 'firearm',
      brand: 'Glock',
      model: 'Glock 19 Gen 5 MOS',
      family: 'Glock 19',
      generation: '5',
      caliber: '9×19mm Parabellum',
      calibers: ['9×19mm Parabellum'],
      capacity: 15,
      barrelLength: 4.02,
    })
  })

  it('reads an ammo title with a price', () => {
    expect(specsFromTitle(AMMO, {price: 18.99})).toEqual({
      kind: 'ammo',
      caliber: '9×19mm Parabellum',
      calibers: ['9×19mm Parabellum'],
      roundsPerBox: 50,
      costPerRound: 0.3798,
    })
  })

  it('keeps every caliber of a multi-caliber gun', () => {
    const s = specsFromTitle('Smith & Wesson Model 686 .357 Mag / .38 Special 6" 6rd Revolver')
    expect(s.caliber).toBe('.357 Mag')
    expect(s.calibers).toEqual(['.357 Mag', '.38 S&W Special'])
    expect(s.brand).toBe('Smith & Wesson')
  })

  it('returns nothing when the title has no specs', () => {
    expect(specsFromTitle('Gift card $50')).toEqual({})
    expect(specsFromTitle('')).toEqual({})
  })

  it('ignores a zero or missing price', () => {
    expect(specsFromTitle(AMMO, {price: 0}).costPerRound).toBeUndefined()
  })
})

describe('planFill', () => {
  const parsed = specsFromTitle(GLOCK)

  it('fills only empty fields and reports the kept ones', () => {
    const plan = planFill({brand: 'Glock Inc', capacity: 15}, parsed, DEFAULT_SPEC_FIELDS, 'empty')
    expect(plan.set).toEqual({
      kind: 'firearm',
      model: 'Glock 19 Gen 5 MOS',
      generation: '5',
      caliber: '9×19mm Parabellum',
      barrelLength: 4.02,
    })
    expect(plan.kept).toEqual(['brand'])
  })

  it('overwrites in mode all, skipping equal values', () => {
    const plan = planFill({brand: 'Glock Inc', capacity: 15}, parsed, DEFAULT_SPEC_FIELDS, 'all')
    expect(plan.set.brand).toBe('Glock')
    expect(plan.set).not.toHaveProperty('capacity')
    expect(plan.kept).toEqual([])
  })

  it('only touches enabled fields', () => {
    const plan = planFill(undefined, parsed, ['caliber', 'capacity'], 'empty')
    expect(plan.set).toEqual({caliber: '9×19mm Parabellum', capacity: 15})
  })

  it('treats arrays by value', () => {
    const plan = planFill({calibers: ['9×19mm Parabellum']}, parsed, ALL_SPEC_FIELDS, 'all')
    expect(plan.set).not.toHaveProperty('calibers')
  })

  it('computes cost per round from the rounds already in the form', () => {
    const fromTitle = specsFromTitle('Federal American Eagle 9mm Luger 115gr FMJ', {price: 18.99})
    expect(fromTitle.roundsPerBox).toBeUndefined()
    const plan = planFill({roundsPerBox: 50}, fromTitle, DEFAULT_SPEC_FIELDS, 'empty', 18.99)
    expect(plan.set.costPerRound).toBe(0.3798)
  })
})

describe('describeSpecs', () => {
  it('summarizes enabled fields', () => {
    expect(describeSpecs(specsFromTitle(GLOCK), DEFAULT_SPEC_FIELDS)).toBe(
      'Firearm · Glock 19 Gen 5 MOS · 9×19mm Parabellum · 15 rd mag · 4.02" barrel',
    )
    expect(
      describeSpecs(specsFromTitle(AMMO, {price: 18.99}), [
        'caliber',
        'roundsPerBox',
        'costPerRound',
      ]),
    ).toBe('9×19mm Parabellum · 50 rounds · 0.38/rd')
    expect(describeSpecs({})).toBe('')
  })
})
