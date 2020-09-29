/* global describe, expect, jest, test */

const { publishHome, timeZoneGroups } = require('../home')
const { publishView } = require('../slack')

jest.mock('../db')
jest.mock('../slack')

describe('home view', () => {
  test('calls publishView with correct instance and user', async () => {
    const instanceRef = 'T0'
    const user = 'U1337'
    await publishHome({ instanceRef, user })
    expect(publishView).toHaveBeenCalledTimes(1)
    expect(publishView.mock.calls[0][0]).toHaveProperty('accessToken')
    expect(publishView.mock.calls[0][1]).toBe(user)
  })
})

describe('time zone groups', () => {
  test('includes Europe/Copenhagen', () => {
    const zones = timeZoneGroups()
    expect(zones).toHaveProperty('Europe')
    expect(zones.Europe).toContain('Europe/Copenhagen')
  })

  test('No continent has less than 100 timezones', () => {
    const zones = timeZoneGroups()
    for (const [, zoneList] of Object.entries(zones)) {
      expect(zoneList.length).toBeGreaterThan(0)
      expect(zoneList.length).toBeLessThan(100)
    }
  })
})
