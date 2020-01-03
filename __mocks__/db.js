module.exports = {
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
  async instancesWithNoScheduledAnnounces () {
    return [
      {
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
    ]
  },
  async lastAnnounce () {
    return '2020-01-02T12:34:56'
  },
  recentClickTimes () { return [] },
  slowestClickTimes () { return [] },
  async signingSecret (team) {
    return `SIGNINGSECRET_${team}`
  }
}
