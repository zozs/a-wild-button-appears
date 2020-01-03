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
  recentClickTimes () { return [] },
  slowestClickTimes () { return [] },
  async signingSecret (team) {
    return `SIGNINGSECRET_${team}`
  }
}
