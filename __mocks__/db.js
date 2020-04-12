/* global jest */

const { DateTime } = require('luxon')

module.exports = {
  clickData (uuid) {
    return {
      clicks: [
        {
          user: 'test1',
          clickTime: '2020-01-02T12:34:56.000Z'
        },
        {
          user: 'test2',
          clickTime: '2020-01-02T12:34:56.350Z'
        },
        {
          user: 'test3',
          clickTime: '2020-01-02T12:34:57.350Z'
        }
      ]
    }
  },
  clicksPerUser () {
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
  fastestClickTimes () { return [] },
  installInstance: jest.fn(async (instance) => {}),
  async instancesWithNoScheduledAnnounces () {
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
  },
  storeScheduled: jest.fn(async (instanceRef, timestamp, messageId) => {}),
  lastAnnounce: jest.fn(async (instanceRef, now) => DateTime.fromISO('2020-01-02T12:34:56.000Z').toUTC()),
  recordClick: jest.fn(async (instanceRef, uuid, user, time) => {
    return true
  }),
  recentClickTimes () { return [] },
  slowestClickTimes () { return [] }
}
