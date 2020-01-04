/* global describe, expect, test */

const { DateTime } = require('luxon')

const button = require('./button')

describe('button to', () => {
  test('have a uuid matching the timestamp', () => {
    const t = DateTime.utc(2020, 1, 4, 16, 37, 12, 0)
    const btn = button(t)

    expect(JSON.parse(btn.attachments)[0].actions[0].value).toBe('2020-01-04T16:37:12.000Z')
  })
})
