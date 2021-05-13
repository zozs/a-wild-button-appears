const db = require('./db')
const slack = require('./slack')

const { DateTime } = require('luxon')

function formatTime (uuid, time) {
  return DateTime.fromJSDate(time).diff(DateTime.fromISO(uuid), 'seconds').seconds.toFixed(2)
}

function wonMessageFormatter (uuid, clickData) {
  // TODO: add block in case this was the 100, 200, etc. button.
  const winnerUser = clickData.clicks[0].user
  const winnerClickTime = formatTime(uuid, clickData.clicks[0].timestamp)

  const runnersUp = clickData.clicks.slice(1)
  const runnersUpTexts = runnersUp.map(r => `<@${r.user}> (${formatTime(uuid, r.timestamp)} s)`)

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*A wild BUTTON appears!*'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:heavy_check_mark: <@${winnerUser}> won (${winnerClickTime} s)!`
      }
    }
  ]

  if (runnersUp.length > 0) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: runnersUpTexts.join(', ') + ' was close!'
        }
      ]
    })
  }

  const wonMessage = {
    text: 'The button has a winner!',
    blocks
  }
  return wonMessage
}

module.exports = {
  async click (res, payload, asyncEventHandler) {
    // launch async call to click recorder. this is done through a handler, since in
    // some cases we need to launch an async call to another lambda function (when deploying
    // e.g., on AWS). Running locally, we can just call clickRecorder in the same thread,
    // but we ensure it is deferred to the next event loop so we acknowledge as soon as possible.

    const timestamp = DateTime.fromMillis(Math.round(parseFloat(payload.actions[0].action_ts) * 1000))

    await asyncEventHandler({
      method: 'click',
      instanceRef: payload.team.id, // TODO: currently assuming that instanceRef is always team id.
      uuid: payload.actions[0].value,
      user: payload.user.id,
      responseUrl: payload.response_url,
      timestamp: timestamp.toISO()
    })

    // immediately acknowledge click. we'll update message in the click recorder instead.
    res.send('')
  },

  async clickRecorder ({ instanceRef, uuid, user, timestamp, responseUrl }) {
    // record click, duplicate clicks by same user will be silently ignored.
    // firstClick is true if we believe this was the first click of the button.
    // it is up to the db layer to filter out duplicates and ensure all times are
    // within the runner up window.
    const timestampObj = DateTime.fromISO(timestamp)
    const firstClick = await db.recordClick(instanceRef, uuid, user, timestampObj)
    if (firstClick) {
      // send an update response immediately, also update later in case db is inconsistent.
      const firstClickData = await db.clickData(instanceRef, uuid)
      if (firstClickData.clicks.length > 0) {
        await slack.sendReplacingResponse(responseUrl, wonMessageFormatter(uuid, firstClickData))
      }
    }

    // After this, we wait the runner up windows + some extra second for db to be consistent,
    // then we update the message with the final results.
    // Default is 2 + 1 seconds.
    const runnerUpWindow = parseInt(process.env.RUNNER_UP_WINDOW) || 2000
    const consistencyTime = parseInt(process.env.CONSISTENCY_TIME) || 1000
    const waitTime = runnerUpWindow + consistencyTime
    await new Promise(resolve => setTimeout(() => resolve(), waitTime))

    const clickData = await db.clickData(instanceRef, uuid)
    await slack.sendReplacingResponse(responseUrl, wonMessageFormatter(uuid, clickData))
  }
}
