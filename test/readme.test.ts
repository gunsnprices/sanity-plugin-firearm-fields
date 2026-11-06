import {listBrands, magazineCapacity, roundsPerBox} from 'gunsnprices'
import {describe, expect, it} from 'vitest'

import {caliberStatus, searchCalibers, specsFromTitle} from '../src'

// keeps the examples in README.md honest
describe('README examples', () => {
  it('helpers', () => {
    expect(caliberStatus('9mm Luger')).toMatchObject({
      state: 'alias',
      caliber: {name: '9×19mm Parabellum', type: 'handgun'},
    })
    const blk = searchCalibers('300 blk')
    expect(blk).toHaveLength(1)
    expect(blk[0]).toMatchObject({caliber: {name: '.300 AAC Blackout'}, match: 'alias'})
    expect(searchCalibers('creed', 2).map((s) => s.caliber.name)).toEqual([
      '6.5mm Creedmoor',
      '6mm Creedmoor',
    ])
    expect(specsFromTitle('Ruger 10/22 Carbine .22 LR 18.5" 10rd')).toEqual({
      kind: 'firearm',
      brand: 'Ruger',
      model: 'Ruger 10/22 Carbine',
      family: 'Ruger 10/22',
      caliber: '.22 LR',
      calibers: ['.22 LR'],
      capacity: 10,
      barrelLength: 18.5,
    })
  })

  it('field notes', () => {
    expect(listBrands()).toEqual(
      expect.arrayContaining(['Glock', 'Sig Sauer', 'Smith & Wesson', 'Ruger']),
    )
    expect(magazineCapacity('Glock 19 9mm 15+1')).toBe(15)
    expect(roundsPerBox('Winchester 9mm 1000rd case')).toBe(1000)
    expect(roundsPerBox('Hornady 6.5 Creedmoor 143gr ELD-X 20/box')).toBe(20)
  })

  it('caliber spellings from the intro', () => {
    const top = (q: string) => searchCalibers(q)[0]?.caliber.name
    expect(top('9mm luger')).toBe('9×19mm Parabellum')
    expect(top('9x19')).toBe('9×19mm Parabellum')
    expect(top('300 blk')).toBe('.300 AAC Blackout')
    expect(top('5.56')).toBe('5.56×45mm NATO')
    expect(top('12ga')).toBe('12 Gauge')
    expect(top('30-06')).toBe('.30-06 Springfield')
  })
})
