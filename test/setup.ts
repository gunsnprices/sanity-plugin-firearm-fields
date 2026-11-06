/* oxlint-disable typescript/no-unsafe-type-assertion -- jsdom stubs */
import {cleanup} from '@testing-library/react'
import {afterEach} from 'vitest'

// jsdom lacks these; @sanity/ui touches them
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
// sanity 5 reads CSS.supports when imported
globalThis.CSS ??= {supports: () => false, escape: (s: string) => s} as unknown as typeof CSS
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}

afterEach(() => cleanup())
