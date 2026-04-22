import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getThinkingBodyClass,
  getThinkingWrapperClass,
} from './thinking-panel-styles'

test('expanded thinking wrapper is not constrained to the old fixed 500px height', () => {
  const className = getThinkingWrapperClass(true)

  assert.ok(!className.includes('max-h-[500px]'))
  assert.ok(className.includes('max-h-[70vh]'))
})

test('thinking body supports vertical scrolling for long reasoning content', () => {
  const className = getThinkingBodyClass()

  assert.ok(className.includes('overflow-y-auto'))
  assert.ok(className.includes('max-h-[60vh]'))
})
