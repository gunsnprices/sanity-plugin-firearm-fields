import {listCalibers} from 'gunsnprices'
import {describe, expect, it} from 'vitest'

import {CALIBER_CLASS_LABELS, caliberByName, caliberStatus, searchCalibers} from '../src'
import {POPULARITY} from '../src/popularity'

const top = (q: string) => searchCalibers(q)[0]?.caliber.name
const names = (q: string, n = 12) => searchCalibers(q, n).map((s) => s.caliber.name)

describe('searchCalibers', () => {
  it('puts the standard name first for another spelling', () => {
    expect(top('9mm luger')).toBe('9×19mm Parabellum')
    expect(searchCalibers('9mm luger')[0]?.match).toBe('alias')
    expect(top('300 blk')).toBe('.300 AAC Blackout')
    expect(top('12ga')).toBe('12 Gauge')
    expect(top('5.56')).toBe('5.56×45mm NATO')
    expect(top('6.5 cr')).toBe('6.5mm Creedmoor')
    expect(top('30-06')).toBe('.30-06 Springfield')
  })

  it('suggests while the user is still typing', () => {
    expect(top('9mm lu')).toBe('9×19mm Parabellum')
    expect(top('creed')).toBe('6.5mm Creedmoor')
    expect(names('creed')).toContain('6mm Creedmoor')
    expect(names('556')).toContain('5.56×45mm NATO')
  })

  it('ranks name matches by how often the caliber is listed', () => {
    const r = names('223')
    expect(r[0]).toBe('.223 Rem')
    expect(r).toContain('.223 Wylde')
    expect(names('22')[0]).toBe('.22 LR')
    expect(names('gauge').slice(0, 2)).toEqual(['12 Gauge', '20 Gauge'])
  })

  it('treats an exact name as a name match', () => {
    const [first] = searchCalibers('9×19mm Parabellum')
    expect(first?.caliber.name).toBe('9×19mm Parabellum')
    expect(first?.match).toBe('name')
  })

  it('returns the most listed calibers for an empty query', () => {
    expect(names('', 3)).toEqual(['9×19mm Parabellum', '12 Gauge', '.22 LR'])
    expect(searchCalibers('', 40)).toHaveLength(40)
  })

  it('returns nothing for nonsense and respects the limit', () => {
    expect(searchCalibers('xyzzy')).toEqual([])
    expect(searchCalibers('mm', 5)).toHaveLength(5)
  })
})

describe('caliberStatus', () => {
  it('classifies values', () => {
    expect(caliberStatus('9×19mm Parabellum')).toMatchObject({state: 'standard'})
    expect(caliberStatus('9mm Luger')).toMatchObject({
      state: 'alias',
      caliber: {name: '9×19mm Parabellum', type: 'handgun'},
    })
    expect(caliberStatus('banana')).toEqual({state: 'unknown'})
    expect(caliberStatus('')).toEqual({state: 'empty'})
    expect(caliberStatus(undefined)).toEqual({state: 'empty'})
    expect(caliberStatus(42)).toEqual({state: 'empty'})
  })

  it('finds calibers by exact name', () => {
    expect(caliberByName('.22 LR')?.type).toBe('rimfire')
    expect(caliberByName('22 lr')).toBeNull()
  })
})

describe('data', () => {
  it('has a popularity rank for every caliber in the parser data', () => {
    const ids = new Set(listCalibers().map((c) => c.id))
    expect(new Set(POPULARITY)).toEqual(ids)
    expect(POPULARITY).toHaveLength(ids.size)
  })

  it('has a label for every caliber class', () => {
    const all = listCalibers()
    expect(all).toHaveLength(293)
    for (const c of all) expect(CALIBER_CLASS_LABELS[c.type]).toBeTruthy()
  })
})
