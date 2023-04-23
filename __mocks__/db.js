/* global jest */

const { DateTime } = require('luxon')

module.exports = {
  clickData: jest.fn(async (instanceRef, uuid) => {
    if (instanceRef === undefined || uuid === undefined) {
      throw new Error('instanceRef or uuid must be given')
    }
    return {
      clicks: [
        {
          user: 'test1',
          timestamp: DateTime.fromISO('2020-01-02T12:34:56.000Z').toBSON()
        },
        {
          user: 'test2',
          timestamp: DateTime.fromISO('2020-01-02T12:34:56.350Z').toBSON()
        },
        {
          user: 'test3',
          timestamp: DateTime.fromISO('2020-01-02T12:34:57.350Z').toBSON()
        }
      ]
    }
  }),
  async clicksPerUser (instanceRef) {
    if (!instanceRef) {
      throw new Error('no instanceRef given')
    }
    return [
      {
        user: 'test1',
        count: 5
      },
      {
        user: 'test2',
        count: 1
      }
    ]
  },
  async fastestClickTimes (instanceRef) {
    if (!instanceRef) {
      throw new Error('no instanceRef given')
    }
    return []
  },
  installInstance: jest.fn(async (instance) => {}),
  instance: jest.fn(async (instanceRef) => ({
    name: 'test instance',
    accessToken: 'xoxp-1234',
    team: {
      id: 'T00000000',
      name: 'testteam'
    },
    channel: 'C00000000',
    manualAnnounce: false,
    weekdays: 0b1111100, // monday - friday
    intervalStart: 32400, // 09:00
    intervalEnd: 57600, // 16:00
    timezone: 'Europe/Copenhagen',
    authedUser: {
      id: 'U1337',
      name: 'yoyo'
    }
  })),
  instancesWithNoScheduledAnnounces: jest.fn(async () => {
    return [
      {
        // id: 0,
        name: 'test instance',
        accessToken: 'xoxp-1234',
        team: {
          id: 'T00000000',
          name: 'testteam'
        },
        channel: 'C00000000',
        manualAnnounce: false,
        weekdays: 0b1111100, // monday - friday
        intervalStart: 32400, // 09:00
        intervalEnd: 57600, // 16:00
        timezone: 'Europe/Copenhagen'
      }
    ]
  }),
  setChannel: jest.fn(async (instanceRef, channel) => {}),
  setEndTime: jest.fn(async (instanceRef, timezone) => {}),
  setStartTime: jest.fn(async (instanceRef, timezone) => {}),
  setTimezone: jest.fn(async (instanceRef, timezone) => {}),
  setUserSetting: jest.fn(async (instanceRef, userRef, name, value) => {}),
  setWeekdays: jest.fn(async (instanceRef, weekdayMask) => {}),
  scheduled: jest.fn(async (instanceRef) => {}),
  storeScheduled: jest.fn(async (instanceRef, timestamp, messageId, channel) => {}),
  lastAnnounce: jest.fn(async (instanceRef, now) => DateTime.fromISO('2020-01-02T12:34:56.000Z').toUTC()),
  recordClick: jest.fn(async (instanceRef, uuid, user, time) => {
    return true
  }),
  async recentClickTimes () { return [] },
  async slowestClickTimes (instanceRef) { return [] },
  async userSettings (instanceRef, userRef) { return {} },
  async winningStreaks (instanceRef) { return [{ user: 'test1', streak: 3 }] }
}
