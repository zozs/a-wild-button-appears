/* global describe, expect, jest, test */

const { statsBlocks, statsCommand } = require('../stats')

jest.mock('../db')

// silence console.debug
console.debug = jest.fn()

describe('stats command', () => {
  test('calls send on res object', async () => {
    const mock = { send: jest.fn() }
    await statsCommand(mock, 'T1')
    expect(mock.send).toHaveBeenCalledTimes(1)
    expect(mock.send.mock.calls[0][0]).not.toBeNull()
  })
})

describe('stats blocks', () => {
  test('includes five wins for test1', async () => {
    const stats = await statsBlocks('T1')
    expect(stats[1].fields[0].text).toMatch(/5 <@test1>/)
  })

  test('includes some streak wins', async () => {
    const stats = await statsBlocks('T1')
    expect(stats[1].fields[1].text).toMatch(/3 <@test1>/)
  })

  test('does not includes stats interval if user id is not passed', async () => {
    const stats = await statsBlocks('T1')
    expect(stats).toHaveLength(3)
  })

  test('includes default Forever stats interval if nothing else is set', async () => {
    const stats = await statsBlocks('T1', 'U1234')
    expect(stats).toHaveLength(4)
  })
})
