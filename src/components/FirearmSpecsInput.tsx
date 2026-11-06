import {Button, Card, Flex, Stack, Text} from '@sanity/ui'
import {useMemo, useState} from 'react'
import {set, setIfMissing, useFormValue, type ObjectInputProps, type Path} from 'sanity'

import {
  readSourceOptions,
  toAbsolutePath,
  type FillSourceOptions,
  type ResolvedConfig,
} from '../config'
import {
  describeSpecs,
  isSpecField,
  planFill,
  specsFromTitle,
  type FirearmSpecs,
  type SpecField,
} from '../specs'

/**
 * Options you can set on a `firearmSpecs` field (`options: {...}`); they override the plugin options.
 * @public
 */
export type FirearmSpecsFieldOptions = FillSourceOptions

const LABELS: Record<SpecField, string> = {
  kind: 'type',
  brand: 'brand',
  model: 'model',
  family: 'model family',
  generation: 'generation',
  caliber: 'caliber',
  calibers: 'calibers',
  capacity: 'capacity',
  barrelLength: 'barrel length',
  roundsPerBox: 'rounds per box',
  costPerRound: 'cost per round',
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(/[$,\s]/g, ''))
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

/** @internal */
export interface FillFromTitlePanelProps {
  title: unknown
  titleLabel: string
  value: FirearmSpecs | undefined
  fields: readonly SpecField[]
  price?: number
  brand?: string
  mpn?: string
  readOnly?: boolean
  onApply: (values: FirearmSpecs) => void
}

/**
 * The "Fill from title" panel: shows what the title gives and writes it on click.
 * @internal
 */
export function FillFromTitlePanel(props: FillFromTitlePanelProps) {
  const {title, titleLabel, value, fields, price, brand, mpn, readOnly, onApply} = props
  const [status, setStatus] = useState('')
  const text = typeof title === 'string' ? title.trim() : ''

  const parsed = useMemo(
    () => (text ? specsFromTitle(text, {price, brand, mpn}) : {}),
    [text, price, brand, mpn],
  )
  const fillEmpty = planFill(value, parsed, fields, 'empty', price)
  const fillAll = planFill(value, parsed, fields, 'all', price)
  const emptyCount = Object.keys(fillEmpty.set).length
  const allCount = Object.keys(fillAll.set).length
  const preview = describeSpecs({...parsed, ...fillAll.set}, fields)

  let note: string
  if (title !== undefined && title !== null && typeof title !== 'string') {
    note = `“${titleLabel}” is not a text field, so there is nothing to read.`
  } else if (!text) {
    note = `Add a ${titleLabel} to fill these fields from it.`
  } else if (!preview) {
    note = 'Nothing recognized in the title.'
  } else {
    note = `From the title: ${preview}`
  }

  const apply = (mode: 'empty' | 'all') => {
    const plan = mode === 'empty' ? fillEmpty : fillAll
    const n = Object.keys(plan.set).length
    if (n) onApply(plan.set)
    const kept = plan.kept.length ? ` Kept your ${plan.kept.map((f) => LABELS[f]).join(', ')}.` : ''
    setStatus(n ? `Filled ${plural(n, 'field')}.${kept}` : `Nothing to fill.${kept}`)
  }

  return (
    <Card padding={3} radius={2} border tone="transparent" data-testid="fill-from-title">
      <Stack gap={3}>
        <Text size={1} muted={!preview}>
          {note}
        </Text>
        <Flex gap={2} wrap="wrap" align="center">
          <Button
            fontSize={1}
            padding={2}
            tone="primary"
            text={
              emptyCount ? `Fill from title (${plural(emptyCount, 'field')})` : 'Fill from title'
            }
            disabled={readOnly || emptyCount === 0}
            onClick={() => apply('empty')}
          />
          {allCount > emptyCount && (
            <Button
              fontSize={1}
              padding={2}
              mode="ghost"
              tone="caution"
              text={`Overwrite ${plural(allCount, 'field')}`}
              disabled={readOnly}
              onClick={() => apply('all')}
            />
          )}
          {status && (
            <Text as="output" size={1} muted>
              {status}
            </Text>
          )}
        </Flex>
      </Stack>
    </Card>
  )
}

function useFieldValue(path: Path | null): unknown {
  // hooks can't be skipped; `_type` is a harmless stand-in when the field isn't configured
  const v = useFormValue(path ?? ['_type'])
  return path ? v : undefined
}

function lastName(path: Path): string {
  const s = [...path].reverse().find((p) => typeof p === 'string')
  return typeof s === 'string' ? s : 'title'
}

/**
 * Object input for `firearmSpecs`: the regular fields plus the "Fill from title" panel.
 * @internal
 */
export function FirearmSpecsInput(props: ObjectInputProps & {config: ResolvedConfig}) {
  const {config, schemaType, path, value, onChange, readOnly, renderDefault} = props
  const opts = {...config.source, ...readSourceOptions(schemaType.options)}
  const titlePath = toAbsolutePath(opts.titleField || 'title', path)
  const title = useFieldValue(titlePath)
  const price = toNumber(
    useFieldValue(opts.priceField ? toAbsolutePath(opts.priceField, path) : null),
  )
  const brandValue = useFieldValue(opts.brandField ? toAbsolutePath(opts.brandField, path) : null)
  const mpnValue = useFieldValue(opts.mpnField ? toAbsolutePath(opts.mpnField, path) : null)
  const enabled = schemaType.fields.map((f) => f.name).filter(isSpecField)

  const onApply = (values: FirearmSpecs) => {
    onChange([
      setIfMissing({_type: schemaType.name}),
      ...Object.entries(values).map(([k, v]) => set(v, [k])),
    ])
  }

  return (
    <Stack gap={4}>
      <FillFromTitlePanel
        title={title}
        titleLabel={lastName(titlePath)}
        value={value as FirearmSpecs | undefined}
        fields={enabled}
        price={price}
        brand={typeof brandValue === 'string' ? brandValue : undefined}
        mpn={typeof mpnValue === 'string' ? mpnValue : undefined}
        readOnly={readOnly}
        onApply={onApply}
      />
      {renderDefault(props)}
    </Stack>
  )
}
