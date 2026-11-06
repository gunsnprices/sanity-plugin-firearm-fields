/* oxlint-disable typescript/no-unsafe-type-assertion -- test doubles */
import {ThemeProvider} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'
import {render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type {ReactElement} from 'react'
import type {StringInputProps} from 'sanity'
import {describe, expect, it, vi} from 'vitest'

import {CaliberCombobox} from '../src/components/CaliberCombobox'
import {CaliberInfo, CaliberInput} from '../src/components/CaliberInput'
import {FillFromTitlePanel} from '../src/components/FirearmSpecsInput'
import {DEFAULT_SPEC_FIELDS} from '../src/specs'

const theme = buildTheme()
const ui = (el: ReactElement) => render(<ThemeProvider theme={theme}>{el}</ThemeProvider>)
const optionNames = () =>
  within(screen.getByRole('listbox'))
    .getAllByRole('option')
    .map((o) => o.getAttribute('data-value'))

describe('CaliberCombobox', () => {
  it('suggests the standard name for "9mm luger" and commits it on Enter', async () => {
    const onCommit = vi.fn()
    ui(<CaliberCombobox value="" onCommit={onCommit} />)
    const input = screen.getByRole('combobox')
    await userEvent.type(input, '9mm luger')
    expect(optionNames()[0]).toBe('9×19mm Parabellum')
    expect(screen.getAllByRole('option')[0]).toHaveProperty(
      'textContent',
      expect.stringContaining('Handgun'),
    )
    await userEvent.keyboard('{Enter}')
    expect(onCommit).toHaveBeenCalledWith('9×19mm Parabellum')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect((input as HTMLInputElement).value).toBe('9×19mm Parabellum')
  })

  it('moves through suggestions with the arrow keys and picks with a click', async () => {
    const onCommit = vi.fn()
    ui(<CaliberCombobox value="" onCommit={onCommit} />)
    await userEvent.type(screen.getByRole('combobox'), 'creed')
    expect(optionNames().slice(0, 2)).toEqual(['6.5mm Creedmoor', '6mm Creedmoor'])
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onCommit).toHaveBeenLastCalledWith('6mm Creedmoor')

    await userEvent.clear(screen.getByRole('combobox'))
    await userEvent.type(screen.getByRole('combobox'), '300 bl')
    await userEvent.click(screen.getAllByRole('option')[0])
    expect(onCommit).toHaveBeenLastCalledWith('.300 AAC Blackout')
  })

  it('keeps free text on blur and offers it as an option', async () => {
    const onCommit = vi.fn()
    ui(<CaliberCombobox value="" onCommit={onCommit} />)
    await userEvent.type(screen.getByRole('combobox'), '7.65 Banana')
    expect(screen.getByText('Use “7.65 Banana” as typed')).toBeTruthy()
    await userEvent.tab()
    expect(onCommit).toHaveBeenCalledWith('7.65 Banana')
  })

  it('shows popular calibers on focus when empty and closes on Escape', async () => {
    ui(<CaliberCombobox value="" onCommit={() => {}} />)
    await userEvent.click(screen.getByRole('combobox'))
    expect(optionNames().slice(0, 3)).toEqual(['9×19mm Parabellum', '12 Gauge', '.22 LR'])
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('clears the value when the text is erased', async () => {
    const onCommit = vi.fn()
    ui(<CaliberCombobox value=".22 LR" onCommit={onCommit} />)
    await userEvent.clear(screen.getByRole('combobox'))
    await userEvent.tab()
    expect(onCommit).toHaveBeenCalledWith(undefined)
  })
})

describe('CaliberInfo', () => {
  it('shows the class and offers the standard name for another spelling', async () => {
    const onNormalize = vi.fn()
    ui(<CaliberInfo value="9mm Luger" links={false} onNormalize={onNormalize} />)
    expect(screen.getByText('Handgun')).toBeTruthy()
    expect(screen.getByText(/Standard name: 9×19mm Parabellum/)).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
    await userEvent.click(screen.getByRole('button', {name: 'Use standard name'}))
    expect(onNormalize).toHaveBeenCalledWith('9×19mm Parabellum')
  })

  it('links to the price comparison page only when links are on', () => {
    ui(<CaliberInfo value="9×19mm Parabellum" links />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe(
      'https://gunsnprices.com/ammo/handgun-ammo/9-19mm-parabellum',
    )
    expect(link.getAttribute('rel')).toBe('noopener')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders nothing for unknown values', () => {
    ui(<CaliberInfo value="banana" links />)
    expect(screen.queryByTestId('caliber-info')).toBeNull()
  })
})

describe('CaliberInput', () => {
  it('turns a pick into a Sanity set patch', async () => {
    const onChange = vi.fn()
    const props = {
      value: undefined,
      onChange,
      readOnly: false,
      schemaType: {name: 'caliber', jsonType: 'string', options: {}},
      elementProps: {id: 'cal', ref: {current: null}, onFocus: () => {}, onBlur: () => {}},
    } as unknown as StringInputProps
    ui(<CaliberInput {...props} />)
    await userEvent.type(screen.getByRole('combobox'), '12ga{Enter}')
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({type: 'set', path: [], value: '12 Gauge'}),
    )
    expect(screen.getByRole('combobox').id).toBe('cal')
  })
})

describe('FillFromTitlePanel', () => {
  const title = 'Glock 19 Gen 5 MOS 9mm 4.02" 15rd Pistol'

  it('previews the title and fills empty fields', async () => {
    const onApply = vi.fn()
    ui(
      <FillFromTitlePanel
        title={title}
        titleLabel="title"
        value={undefined}
        fields={DEFAULT_SPEC_FIELDS}
        onApply={onApply}
      />,
    )
    expect(
      screen.getByText(/From the title: Firearm · Glock 19 Gen 5 MOS · 9×19mm Parabellum/),
    ).toBeTruthy()
    await userEvent.click(screen.getByRole('button', {name: 'Fill from title (7 fields)'}))
    expect(onApply).toHaveBeenCalledWith({
      kind: 'firearm',
      brand: 'Glock',
      model: 'Glock 19 Gen 5 MOS',
      generation: '5',
      caliber: '9×19mm Parabellum',
      capacity: 15,
      barrelLength: 4.02,
    })
    expect(screen.getByRole('status').textContent).toBe('Filled 7 fields.')
  })

  it('keeps edited values unless asked to overwrite', async () => {
    const onApply = vi.fn()
    ui(
      <FillFromTitlePanel
        title={title}
        titleLabel="title"
        value={{brand: 'GLOCK Inc', capacity: 17}}
        fields={DEFAULT_SPEC_FIELDS}
        onApply={onApply}
      />,
    )
    await userEvent.click(screen.getByRole('button', {name: 'Fill from title (5 fields)'}))
    expect(onApply.mock.calls[0]?.[0]).not.toHaveProperty('brand')
    expect(screen.getByRole('status').textContent).toBe(
      'Filled 5 fields. Kept your brand, capacity.',
    )
    await userEvent.click(screen.getByRole('button', {name: 'Overwrite 7 fields'}))
    expect(onApply.mock.calls[1]?.[0]).toMatchObject({brand: 'Glock', capacity: 15})
  })

  it('explains when there is no title or nothing to read', () => {
    const {unmount} = ui(
      <FillFromTitlePanel
        title=""
        titleLabel="name"
        value={undefined}
        fields={DEFAULT_SPEC_FIELDS}
        onApply={() => {}}
      />,
    )
    expect(screen.getByText('Add a name to fill these fields from it.')).toBeTruthy()
    expect(screen.getByRole('button', {name: 'Fill from title'})).toHaveProperty('disabled', true)
    unmount()
    ui(
      <FillFromTitlePanel
        title={{en: 'x'}}
        titleLabel="title"
        value={undefined}
        fields={DEFAULT_SPEC_FIELDS}
        onApply={() => {}}
      />,
    )
    expect(
      screen.getByText('“title” is not a text field, so there is nothing to read.'),
    ).toBeTruthy()
  })

  it('computes cost per round from a price field', async () => {
    const onApply = vi.fn()
    ui(
      <FillFromTitlePanel
        title="Federal American Eagle 9mm Luger 115gr FMJ 50 Rounds"
        titleLabel="title"
        value={undefined}
        fields={DEFAULT_SPEC_FIELDS}
        price={18.99}
        onApply={onApply}
      />,
    )
    expect(screen.getByText(/50 rounds · 0\.38\/rd/)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', {name: /Fill from title/}))
    expect(onApply.mock.calls[0]?.[0]).toMatchObject({
      kind: 'ammo',
      roundsPerBox: 50,
      costPerRound: 0.3798,
    })
  })
})
