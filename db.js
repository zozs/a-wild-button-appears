const fs = require('fs')
const { promisify } = require('util')

const dataFilename = process.env.DATA

function parseJSON () {
  try {
    let jsonData = fs.readFileSync(dataFilename, 'utf8')
    return JSON.parse(jsonData)
  } catch (e) {
    return {
      clicks: {}
    }
  }
}

async function saveJSON (dataObj) {
  let jsonData = JSON.stringify(dataObj)
  await promisify(fs.writeFile)(dataFilename, jsonData, 'utf8')
}

// Parse the data once on startup, then save when changes are made.
let data = parseJSON()

// Data manipulation functions below.
function clicksPerUser () {
  let clicks = {}
  Object.entries(data.clicks).forEach(([uuid, clickData]) => {
    let user = ''
    if (typeof clickData === 'string') {
      // Old-style format, only user, no time.
      user = clickData
    } else {
      // New-style format, where both user and click-time is recorded.
      user = clickData.user
    }

    if (!clicks.hasOwnProperty(user)) {
      clicks[user] = 0
    }
    clicks[user]++
  })

  // Now return sorted as a list.
  let sorted = []
  Object.entries(clicks).forEach(([user, count]) => sorted.push({user: user, count: count}))
  sorted.sort((a, b) => b.count - a.count)
  return sorted
}

function clickTimes () {
  return Object.entries(data.clicks)
    .filter(([start, clickData]) => typeof clickData !== 'string')
    .map(([start, clickData]) => ({
      user: clickData.user,
      time: Date.parse(clickData.clickTime) - Date.parse(start),
      date: start
    }))
}

function recentClickTimes (n) {
  const times = clickTimes()
  times.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  return times.slice(0, n)
}

function fastestClickTimes (n) {
  const times = clickTimes()
  times.sort((a, b) => a.time - b.time)
  return times.slice(0, n)
}

function slowestClickTimes (n) {
  const times = clickTimes()
  times.sort((a, b) => b.time - a.time)
  return times.slice(0, n)
}

module.exports = {
  isClicked: (uuid) => data.clicks.hasOwnProperty(uuid),
  setClicked: async (uuid, user, clickTime) => {
    data.clicks[uuid] = { user, clickTime, runnersUp: [] }
    await saveJSON(data)
    return data.clicks[uuid]
  },
  addRunnerUp: async (uuid, user, clickTime) => {
    data.clicks[uuid].runnersUp.push({ user, clickTime })
    await saveJSON(data)
    return data.clicks[uuid]
  },
  clickForUuid: (uuid) => data.clicks[uuid],
  clicksPerUser: () => clicksPerUser(),
  recentClickTimes: (n) => recentClickTimes(n),
  slowestClickTimes: (n) => slowestClickTimes(n),
  fastestClickTimes: (n) => fastestClickTimes(n),
  totalClicks: () => Object.keys(data.clicks).length
}
