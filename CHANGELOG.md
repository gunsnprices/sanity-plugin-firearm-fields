# Changelog

## 0.1.0 (2026-11-07)

- First release for Sanity Studio v5 and v6.
- `caliber` type: autocomplete over 293 calibers and their spellings, caliber class badge, "Use standard name"
  for other spellings, warning for values that aren't calibers.
- `firearmSpecs` type: brand, model, family, generation, caliber(s), capacity, barrel length, rounds per box and
  cost per round, with "Fill from title" (empty fields) and "Overwrite".
- Options: `titleField`, `priceField`, `brandField`, `mpnField` (also per field, `^.` for siblings), `fields`,
  `validation`, `links` (off by default), `typeNames`.
- Exports `caliberValidation` and the helpers `searchCalibers`, `caliberStatus`, `specsFromTitle`, `planFill`,
  `describeSpecs`.
