import {Badge, Button, Flex, Stack, Text} from '@sanity/ui'
import {useCallback} from 'react'
import {set, unset, type StringInputProps} from 'sanity'

import {CALIBER_CLASS_LABELS, caliberStatus} from '../calibers'
import {readOption} from '../config'
import {CaliberCombobox} from './CaliberCombobox'

/**
 * Options you can set on a `caliber` field (`options: {...}`).
 * @public
 */
export interface CaliberFieldOptions {
  /** override the plugin's `links` option for this field */
  links?: boolean
}

/** @internal */
export interface CaliberInfoProps {
  value: string | undefined
  links: boolean
  readOnly?: boolean
  onNormalize?: (name: string) => void
}

/**
 * Class badge, "standard name" hint and the optional price comparison link under the caliber input.
 * @internal
 */
export function CaliberInfo({value, links, readOnly, onNormalize}: CaliberInfoProps) {
  const status = caliberStatus(value)
  if (status.state === 'empty' || status.state === 'unknown') return null
  const {caliber} = status
  return (
    <Flex align="center" gap={2} wrap="wrap" data-testid="caliber-info">
      <Badge fontSize={0} tone="primary">
        {CALIBER_CLASS_LABELS[caliber.type]}
      </Badge>
      {status.state === 'alias' && (
        <>
          <Text size={1} muted>
            Standard name: {caliber.name}
          </Text>
          {!readOnly && onNormalize && (
            <Button
              fontSize={1}
              mode="ghost"
              padding={2}
              text="Use standard name"
              onClick={() => onNormalize(caliber.name)}
            />
          )}
        </>
      )}
      {links && caliber.url && (
        <Text size={1}>
          <a href={caliber.url} target="_blank" rel="noopener">
            {caliber.name} prices on GunsNPrices ↗
          </a>
        </Text>
      )}
    </Flex>
  )
}

/**
 * Input for the `caliber` type: autocomplete over the caliber list and its spellings.
 * @internal
 */
export function CaliberInput(props: StringInputProps & {links?: boolean}) {
  const {value, onChange, readOnly, elementProps, schemaType} = props
  const {ref: inputRef, id, placeholder, onFocus, onBlur, style} = elementProps
  const fieldLinks = readOption(schemaType.options, 'links')
  const links = typeof fieldLinks === 'boolean' ? fieldLinks : (props.links ?? false)

  const commit = useCallback(
    (next: string | undefined) => onChange(next ? set(next) : unset()),
    [onChange],
  )

  return (
    <Stack gap={2}>
      <CaliberCombobox
        ref={inputRef}
        id={id}
        value={value ?? ''}
        onCommit={commit}
        readOnly={readOnly}
        placeholder={placeholder || 'Start typing: 9mm, 5.56, 12ga, 300 BLK…'}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-describedby={elementProps['aria-describedby']}
        inputStyle={style}
      />
      <CaliberInfo value={value} links={links} readOnly={readOnly} onNormalize={commit} />
    </Stack>
  )
}
