import {Badge, Box, Card, Flex, Stack, Text, TextInput} from '@sanity/ui'
import {
  useCallback,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
} from 'react'

import {CALIBER_CLASS_LABELS, searchCalibers, type CaliberSuggestion} from '../calibers'

/** @internal */
export interface CaliberComboboxProps {
  /** stored value */
  'value': string
  /** called with the new value; `undefined` clears it */
  'onCommit': (value: string | undefined) => void
  'ref'?: Ref<HTMLInputElement>
  'id'?: string
  'readOnly'?: boolean
  'placeholder'?: string
  'limit'?: number
  'onFocus'?: (event: FocusEvent<HTMLInputElement>) => void
  'onBlur'?: (event: FocusEvent<HTMLInputElement>) => void
  'aria-describedby'?: string
  /** forwarded to the input (Sanity passes an anchor name for popovers) */
  'inputStyle'?: CSSProperties
}

type Row = {kind: 'caliber'; s: CaliberSuggestion} | {kind: 'free'; text: string}

/**
 * Text input with caliber suggestions (WAI-ARIA combobox pattern). Free text is allowed: what you type
 * is kept on blur or Enter when no suggestion is picked.
 * @internal
 */
export function CaliberCombobox(props: CaliberComboboxProps) {
  const {value, onCommit, ref, readOnly, placeholder, limit = 12, onFocus, onBlur} = props
  const autoId = useId()
  const id = props.id || `caliber-${autoId}`
  const listId = `${id}-listbox`
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  // follow outside changes (Fill from title, "Use standard name", another editor)
  const [shownValue, setShownValue] = useState(value)
  if (value !== shownValue) {
    setShownValue(value)
    setQuery(value)
  }

  const rows: Row[] = useMemo(() => {
    if (!open) return []
    const found = searchCalibers(query, limit).map((s) => ({kind: 'caliber' as const, s}))
    const typed = query.trim()
    const free: Row[] =
      typed && !found.some((r) => r.s.caliber.name === typed) ? [{kind: 'free', text: typed}] : []
    return [...found, ...free]
  }, [open, query, limit])

  const commit = useCallback(
    (next: string) => {
      const v = next.trim()
      setOpen(false)
      setQuery(v)
      if (v !== value) onCommit(v || undefined)
    },
    [onCommit, value],
  )

  const pick = (row: Row | undefined) => {
    if (row) commit(row.kind === 'caliber' ? row.s.caliber.name : row.text)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setActive(0)
        setOpen(true)
        return
      }
      const n = rows.length
      if (n) setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n))
    } else if (e.key === 'Enter') {
      if (open && rows.length) {
        e.preventDefault()
        pick(rows[active])
      } else if (query.trim() !== value) {
        e.preventDefault()
        commit(query)
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
      } else if (query !== value) {
        e.preventDefault()
        setQuery(value)
      }
    }
  }

  const optionId = (i: number) => `${id}-option-${i}`
  const expanded = open && rows.length > 0

  return (
    <Box style={{position: 'relative'}}>
      <TextInput
        ref={ref}
        id={id}
        value={query}
        readOnly={readOnly}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- this is an <input>; the role adds the combobox semantics
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded ? optionId(active) : undefined}
        aria-describedby={props['aria-describedby']}
        style={props.inputStyle}
        onChange={(e) => {
          setQuery(e.currentTarget.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
        onFocus={(e) => {
          if (!readOnly && !query) {
            setActive(0)
            setOpen(true)
          }
          onFocus?.(e)
        }}
        onBlur={(e) => {
          if (query.trim() !== value) commit(query)
          else setOpen(false)
          onBlur?.(e)
        }}
      />
      {expanded && (
        <Card
          id={listId}
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- styled suggestion list; <datalist> can't show class badges
          role="listbox"
          aria-label="Caliber suggestions"
          radius={2}
          shadow={2}
          padding={1}
          // keep focus in the input so blur doesn't commit the half-typed text first
          onMouseDown={(e: MouseEvent) => e.preventDefault()}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            marginTop: 4,
            zIndex: 200,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          <Stack gap={1}>
            {rows.map((row, i) => (
              <Card
                key={row.kind === 'caliber' ? row.s.caliber.id : `free:${row.text}`}
                id={optionId(i)}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- option of the listbox above
                role="option"
                aria-selected={i === active}
                data-value={row.kind === 'caliber' ? row.s.caliber.name : row.text}
                padding={2}
                radius={2}
                selected={i === active}
                tone={i === active ? 'primary' : 'default'}
                style={{cursor: 'pointer'}}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(row)}
              >
                {row.kind === 'caliber' ? (
                  <Flex align="center" gap={2}>
                    <Box flex={1}>
                      <Text size={1} weight="medium">
                        {row.s.caliber.name}
                      </Text>
                    </Box>
                    {row.s.match === 'alias' && (
                      <Text size={0} muted>
                        {`“${query.trim()}”`}
                      </Text>
                    )}
                    <Badge fontSize={0}>{CALIBER_CLASS_LABELS[row.s.caliber.type]}</Badge>
                  </Flex>
                ) : (
                  <Text size={1} muted>
                    {`Use “${row.text}” as typed`}
                  </Text>
                )}
              </Card>
            ))}
          </Stack>
        </Card>
      )}
    </Box>
  )
}
