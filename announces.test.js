/* global jest, describe, expect, test */

const { hourlyCheck, nextAnnounce } = require('./announces')
const { DateTime } = require('luxon')

const db = require('./db')
const slack = require('./slack')

const { Instance } = require('./instance')

jest.mock('./db')
jest.mock('./instance')
jest.mock('./slack')

expect.extend({
  toBeWithinRange (received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true
      }
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false
      }
    }
  }
})

// last announce in mock db is '2020-01-02T12:34:56'
const testInstance = new Instance()

describe('own defined range expect extension works when', () => {
  test('lower than range', () => {
    const zone = testInstance.timezone
    const low = DateTime.fromISO('2020-01-03T09:00:00', { zone })
    const high = DateTime.fromISO('2020-01-03T16:00:00', { zone })
    const val = DateTime.fromISO('2020-01-03T07:12:34', { zone })
    expect(val).not.toBeWithinRange(low, high)
  })

  test('in range', () => {
    const zone = testInstance.timezone
    const low = DateTime.fromISO('2020-01-03T09:00:00', { zone })
    const high = DateTime.fromISO('2020-01-03T16:00:00', { zone })
    const val = DateTime.fromISO('2020-01-03T13:12:34', { zone })
    expect(val).toBeWithinRange(low, high)
  })

  test('greater than range', () => {
    const zone = testInstance.timezone
    const low = DateTime.fromISO('2020-01-03T09:00:00', { zone })
    const high = DateTime.fromISO('2020-01-03T16:00:00', { zone })
    const val = DateTime.fromISO('2020-01-04T07:12:34', { zone })
    expect(val).not.toBeWithinRange(low, high)
  })
})

describe('hourly check', () => {
  test('causes message to be scheduled for non-scheduled instances', async () => {
    slack.scheduleMessage.mockImplementation(async () => ({
      scheduled_message_id: 'Q1298393284',
      post_at: '1562180400'
    }))

    await hourlyCheck()
    expect(slack.scheduleMessage.mock.calls.length).toBe(1)
    expect(slack.scheduleMessage.mock.calls[0][0]).toHaveProperty('channel', testInstance.channel)

    expect(db.storeScheduled.mock.calls.length).toBe(1)
    expect(db.storeScheduled.mock.calls[0][0]).toBe('T00000000')
    expect(db.storeScheduled.mock.calls[0][1]).toBeDefined()
    expect(db.storeScheduled.mock.calls[0][2]).toBe('Q1298393284')
  })
})

describe('next announce', () => {
  describe('with no button today when now is', () => {
    test('same day before interval', async () => {
      const instance = { ...testInstance }
      const zone = testInstance.timezone

      const now = DateTime.fromISO('2020-01-03T07:12:34', { zone })
      const intervalLow = DateTime.fromISO('2020-01-03T09:00:00', { zone })
      const intervalHigh = DateTime.fromISO('2020-01-03T16:00:00', { zone })

      const next = await nextAnnounce(instance, now)
      expect(next).toBeWithinRange(intervalLow, intervalHigh)
    })

    test('same day within interval', async () => {
      const instance = { ...testInstance }
      const zone = testInstance.timezone

      const now = DateTime.fromISO('2020-01-03T13:00:00', { zone })
      const intervalLow = DateTime.fromISO('2020-01-03T09:00:00', { zone })
      const intervalHigh = DateTime.fromISO('2020-01-03T16:00:00', { zone })

      const next = await nextAnnounce(instance, now)
      expect(next).toBeWithinRange(intervalLow, intervalHigh)
      expect(next).toBeWithinRange(now, intervalHigh)
    })

    test('same day within interval on last possible second', async () => {
      const instance = { ...testInstance }
      const zone = testInstance.timezone

      const now = DateTime.fromISO('2020-01-03T16:00:00', { zone })
      const intervalLow = DateTime.fromISO('2020-01-03T09:00:00', { zone })
      const intervalHigh = DateTime.fromISO('2020-01-03T16:00:00', { zone })

      const next = await nextAnnounce(instance, now)
      expect(next).toBeWithinRange(intervalLow, intervalHigh)
      expect(next).toStrictEqual(now)
    })

    test('same day after interval (with weekend blocking)', async () => {
      const instance = { ...testInstance }
      const zone = testInstance.timezone

      const now = DateTime.fromISO('2020-01-03T16:00:01', { zone })
      const intervalLow = DateTime.fromISO('2020-01-06T09:00:00', { zone })
      const intervalHigh = DateTime.fromISO('2020-01-06T16:00:00', { zone })

      const next = await nextAnnounce(instance, now)
      expect(next).toBeWithinRange(intervalLow, intervalHigh)
    })
  })

  describe('with button today when now is', () => {
    test('same day before interval', async () => {
      const instance = { ...testInstance }
      const zone = testInstance.timezone

      const now = DateTime.fromISO('2020-01-02T07:12:34', { zone })
      const intervalLow = DateTime.fromISO('2020-01-03T09:00:00', { zone })
      const intervalHigh = DateTime.fromISO('2020-01-03T16:00:00', { zone })

      const next = await nextAnnounce(instance, now)
      expect(next).toBeWithinRange(intervalLow, intervalHigh)
    })

    test('same day within interval', async () => {
      const instance = { ...testInstance }
      const zone = testInstance.timezone

      const now = DateTime.fromISO('2020-01-02T13:00:00', { zone })
      const intervalLow = DateTime.fromISO('2020-01-03T09:00:00', { zone })
      const intervalHigh = DateTime.fromISO('2020-01-03T16:00:00', { zone })

      const next = await nextAnnounce(instance, now)
      expect(next).toBeWithinRange(intervalLow, intervalHigh)
    })

    test('same day after interval', async () => {
      const instance = { ...testInstance }
      const zone = testInstance.timezone

      const now = DateTime.fromISO('2020-01-02T16:00:01', { zone })
      const intervalLow = DateTime.fromISO('2020-01-03T09:00:00', { zone })
      const intervalHigh = DateTime.fromISO('2020-01-03T16:00:00', { zone })

      const next = await nextAnnounce(instance, now)
      expect(next).toBeWithinRange(intervalLow, intervalHigh)
    })
  })

  test('does not get stuck in infinite loop', async () => {
    // permit no weekdays. we should get exception.
    const instance = { ...testInstance, weekdays: 0 }
    const zone = testInstance.timezone

    const now = DateTime.fromISO('2020-01-03T16:00:01', { zone })

    const next = nextAnnounce(instance, now)
    await expect(next).rejects.toThrow()
  })
})
