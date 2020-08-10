/* global describe, expect, test */

const { asyncEventRouter } = require('./async-routes')

describe('async event router', () => {
  test('throws on weird method', async () => {
    await expect(asyncEventRouter({ method: 'nonexistent' }))
      .rejects
      .toThrow('Invalid async')
  })
})
