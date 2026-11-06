# sanity-plugin-firearm-fields

[![npm](https://img.shields.io/npm/v/sanity-plugin-firearm-fields)](https://www.npmjs.com/package/sanity-plugin-firearm-fields)
[![Tests](https://github.com/gunsnprices/sanity-plugin-firearm-fields/actions/workflows/ci.yml/badge.svg)](https://github.com/gunsnprices/sanity-plugin-firearm-fields/actions/workflows/ci.yml)

Sanity Studio fields for gun shops, ammo stores, outdoor retailers and shooting sites:

- **`caliber`**: a caliber picker that knows 293 calibers and the many ways people write them. Type
  `9mm luger`, `9x19`, `300 blk`, `5.56`, `12ga` or `30-06` and it suggests the standard name
  (`9×19mm Parabellum`, `.300 AAC Blackout`, ...). It shows the caliber class (handgun, rifle, rimfire, shotgun,
  airgun, muzzleloader) and warns about values that aren't calibers.
- **`firearmSpecs`**: brand, model, generation, caliber, magazine capacity, barrel length, rounds per box and
  cost per round, with a **Fill from title** button that reads the product title and fills the fields. Editors
  can still change every value.

Everything runs inside the Studio with the [`gunsnprices`](https://www.npmjs.com/package/gunsnprices) title
parser, the one behind the price comparison site [GunsNPrices](https://gunsnprices.com). No network calls, no
API key, no account.

## Install

```sh
npm install sanity-plugin-firearm-fields
```

Works with Sanity Studio v5 and v6.

## Usage

Add the plugin in `sanity.config.ts` (or `.js`):

```ts
import {defineConfig} from 'sanity'
import {firearmFields} from 'sanity-plugin-firearm-fields'

export default defineConfig({
  // ...
  plugins: [firearmFields()],
})
```

Then use the two types in your schema:

```ts
import {defineField, defineType} from 'sanity'

export const product = defineType({
  name: 'product',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string'}),
    defineField({name: 'price', type: 'number'}),
    defineField({name: 'specs', type: 'firearmSpecs'}),
    defineField({name: 'compatibleCaliber', type: 'caliber'}),
  ],
})
```

### Fill from title

The `firearmSpecs` input shows what the title gives, for example
`Firearm · Glock 19 Gen 5 MOS · 9×19mm Parabellum · 15 rd mag · 4.02" barrel`, and two buttons:

- **Fill from title** writes only the fields that are empty.
- **Overwrite** appears when the title disagrees with values already entered, and replaces them.

For ammo, set `priceField` and cost per round is filled too. At a price of 18.99,
`Federal American Eagle 9mm Luger 115gr FMJ 50 Rounds` gives 50 rounds per box and 0.3798 per round. If the
title has no round count, the rounds per box already in the form are used.

When **Type** is set, fields that don't apply stay hidden while empty: model, model family, generation, capacity
and barrel length for ammo; rounds per box and cost per round for firearms.

### The caliber input

- Suggestions come from the standard names and from the parser's list of spellings, most common calibers first.
  With an empty field it lists the most common calibers.
- The value stored is the standard name, as a plain string: `"9×19mm Parabellum"` (with the `×` sign).
- Free text is allowed. If you type something that isn't in the list, it is kept and the field shows a warning.
- An old value written another way (`9mm Luger`) gets a note and a **Use standard name** button.

## Options

```ts
firearmFields({
  titleField: 'name',
  priceField: 'price',
  fields: ['brand', 'model', 'caliber', 'capacity', 'barrelLength'],
})
```

| Option       | Type                                        | Default         |                                                                              |
| ------------ | ------------------------------------------- | --------------- | ---------------------------------------------------------------------------- |
| `titleField` | `string \| Path`                            | `'title'`       | Field "Fill from title" reads                                                |
| `priceField` | `string \| Path`                            |                 | Price field, for cost per round                                              |
| `brandField` | `string \| Path`                            |                 | Brand / manufacturer field; helps identify the model                         |
| `mpnField`   | `string \| Path`                            |                 | Manufacturer part number field; Glock part numbers are decoded               |
| `fields`     | `SpecField[]`                               | see below       | `firearmSpecs` fields to include; all but `family` and `calibers` by default |
| `validation` | `boolean`                                   | `true`          | Warn about caliber values that aren't in the list                            |
| `links`      | `boolean`                                   | `false`         | Show a link from a caliber to its price comparison page on GunsNPrices       |
| `typeNames`  | `{caliber?: string; firearmSpecs?: string}` | the names above | Rename the types if `caliber` or `firearmSpecs` clash with your own          |

Field paths are relative to the document: `'title'`, `'store.title'`, `'variants[0].title'`. Start with `^.` to
read a field next to the `firearmSpecs` object, which is what you want inside array items:

```ts
defineField({
  name: 'variants',
  type: 'array',
  of: [
    {
      type: 'object',
      name: 'variant',
      fields: [
        defineField({name: 'name', type: 'string'}),
        defineField({name: 'specs', type: 'firearmSpecs', options: {titleField: '^.name'}}),
      ],
    },
  ],
})
```

`titleField`, `priceField`, `brandField` and `mpnField` can be set per field like this, and a `caliber` field
takes `options: {links: true}` to override the plugin's `links` option.

### Fields

| Field          | Type        | Default | Filled from the title                            |
| -------------- | ----------- | ------- | ------------------------------------------------ |
| `kind`         | `string`    | on      | `'firearm'` or `'ammo'`                          |
| `brand`        | `string`    | on      | `Glock`                                          |
| `model`        | `string`    | on      | `Glock 19 Gen 5 MOS`                             |
| `family`       | `string`    | off     | `Glock 19`                                       |
| `generation`   | `string`    | on      | `5`                                              |
| `caliber`      | `caliber`   | on      | `9×19mm Parabellum`                              |
| `calibers`     | `caliber[]` | off     | `['.357 Mag', '.38 S&W Special']`                |
| `capacity`     | `number`    | on      | `15` (from `15rd`, `15+1`)                       |
| `barrelLength` | `number`    | on      | `4.02` (inches)                                  |
| `roundsPerBox` | `number`    | on      | `50` (from `50 Rounds`, `1000rd case`, `20/box`) |
| `costPerRound` | `number`    | on      | `0.3798` (needs `priceField`)                    |

Model, family and generation are found for the brands in the parser's model dictionary (Glock, Sig Sauer,
Smith & Wesson, Ruger and others: see `listBrands()` in `gunsnprices`). Ammo brands are left for you to fill.

## Querying

The values are plain strings and numbers, so GROQ works as usual:

```groq
*[_type == "product" && specs.caliber == "9×19mm Parabellum" && specs.capacity >= 15]{
  title, "model": specs.model, "cpr": specs.costPerRound
}
```

## Using the parts on your own fields

```ts
import {caliberValidation} from 'sanity-plugin-firearm-fields'

defineField({name: 'legacyCaliber', type: 'string', validation: caliberValidation})
```

The helpers behind the inputs are exported too, for scripts and migrations:

```ts
import {caliberStatus, searchCalibers, specsFromTitle} from 'sanity-plugin-firearm-fields'

caliberStatus('9mm Luger') // {state: 'alias', caliber: {name: '9×19mm Parabellum', type: 'handgun', ...}}
searchCalibers('300 blk') // [{caliber: {name: '.300 AAC Blackout', ...}, match: 'alias'}]
searchCalibers('creed', 2) // 6.5mm Creedmoor, 6mm Creedmoor
specsFromTitle('Ruger 10/22 Carbine .22 LR 18.5" 10rd')
// {kind: 'firearm', brand: 'Ruger', model: 'Ruger 10/22 Carbine', family: 'Ruger 10/22',
//  caliber: '.22 LR', calibers: ['.22 LR'], capacity: 10, barrelLength: 18.5}
```

Also exported: `planFill`, `describeSpecs`, `caliberByName`, `CALIBER_CLASS_LABELS`, `ALL_SPEC_FIELDS`,
`DEFAULT_SPEC_FIELDS` and the TypeScript types (`FirearmSpecs`, `FirearmFieldsConfig`, `SpecField`, ...).

## Develop

```sh
npm install
npm test        # unit and component tests (Vitest, Testing Library)
npm run build   # plugin-kit verify-package + pkg-utils build
npm run lint
```

To try it in a Studio while you work, see
[Testing a plugin in Sanity Studio](https://github.com/sanity-io/plugins/tree/main/packages/@sanity/plugin-kit#testing-a-plugin-in-sanity-studio)
(`npm run link-watch`).

## License

MIT © GunsNPrices. The caliber and model data come from the `gunsnprices` package (CC BY 4.0, attribution:
GunsNPrices).
