/* global jest, describe, expect, test */

const { hourlyCheck, nextAnnounce } = require('./announces')
const { DateTime } = require('luxon')

const slack = require('./slack')

jest.mock('./db')
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
const testInstance = {
  // id: 0,
  name: 'test instance',
  accessToken: 'xoxp-1234',
  signingSecret: 'TESTtoken',
  team: 'T00000000',
  channel: 'C00000000',
  manualAnnounce: false,
  weekdays: 0b1111100, // monday - friday
  intervalStart: 32400, // 09:00
  intervalEnd: 57600, // 16:00
  timezone: 'Europe/Copenhagen'
}

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
    await hourlyCheck()
    expect(slack.scheduleMessage.mock.calls.length).toBe(1)
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
