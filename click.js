const db = require('./db')
const slack = require('./slack')

const { DateTime } = require('luxon')

/*
function diffTime (uuid, time) {
  return (Date.parse(time) - Date.parse(uuid)) / 1000
}
*/

function formatTime (uuid, time) {
  return ((Date.parse(time) - Date.parse(uuid)) / 1000).toFixed(2)
}

function determiningMessageFormatter () {
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
        text: ':hourglass_flowing_sand: Determining fastest clicks...'
      }
    }
  ]

  const determiningMessage = {
    text: 'Determining winner',
    blocks
  }
  return determiningMessage
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
  async click (res, payload, clickRecorderHandler) {
    // launch async call to click recorder. this is done through a handler, since in
    // some cases we need to launch an async call to another lambda function (when deploying
    // e.g., on AWS). Running locally, we can just call clickRecorder in the same thread,
    // but we ensure it is deferred to the next event loop so we acknowledge as soon as possible.
    clickRecorderHandler({
      instanceRef: payload.team.id, // TODO: currently assuming that instanceRef is always team id.
      uuid: payload.actions[0].value,
      user: payload.user.id,
      timestamp: DateTime.local(), // TODO: use timestamp from slack instead? (action_ts)
      responseUrl: payload.response_url
    })

    // immediately acknowledge click. we'll update message in the click recorder instead.
    res.send('')
  },

  async clickRecorder ({ instanceRef, uuid, user, timestamp, responseUrl }) {
    // record click, duplicate clicks by same user will be silently ignored.
    // firstClick is true if we believe this was the first click of the button.
    // it is up to the db layer to filter out duplicates and ensure all times are
    // within the runner up window.
    const firstClick = await db.recordClick(instanceRef, uuid, user, timestamp)
    if (firstClick) {
      // send an "determining winner" response immediately, show final winner in about 2 seconds.
      await slack.sendReplacingResponse(responseUrl, determiningMessageFormatter())
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

// old below
/*
module.exports = async (res, body) => {
  try {
    const uuid = body.actions[0].value
    const user = body.user.id
    const now = new Date().toISOString()

    // First ensure that someone hasn't already clicked this button.
    if (!db.isClicked(uuid)) {
      // Record the winner in the database.
      const clickData = await db.setClicked(uuid, user, now)
      res.send(wonMessageFormatter(uuid, clickData))
      console.debug(`${now}: ${user}: Recorded successful click!`)

      // Check if it is a special click!
      if (db.totalClicks() % 100 === 0) {
        const attachments = [{
          text: `You are the winner of the ${db.totalClicks()}th button!`,
          color: '#74c8ed'
        }]
        const anniversaryMessage = {
          as_user: false,
          text: '*:tada: Congratulations! :confetti_ball:*',
          attachments: JSON.stringify(attachments),
          channel: process.env.ANNOUNCE_CHANNEL
        }
        // await axios.post('https://slack.com/api/chat.postMessage', qs.stringify(anniversaryMessage))
        // TODO: need instance instead of undefined.
        await slack.postMessage(undefined, anniversaryMessage)
      }
    } else {
      // We have a runner-up! Record this fact in the database as well, after checking validity.
      if (validRunnerUp(uuid, user, now)) {
        const clickData = await db.addRunnerUp(uuid, user, now)
        res.send(wonMessageFormatter(uuid, clickData))
        console.info(`${now}: ${user}: Runner-up! The button was clicked several times before update.`)
      } else {
        console.info(`${now}: ${user}: Invalid runner-up! This click was not recorded.`)
        res.send()
      }
    }
  } catch (e) {
    console.error('Failed to register click. Got error:', e)
  }
}
*/
