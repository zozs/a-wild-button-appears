const db = require('./db')
const slack = require('./slack')

function diffTime (uuid, time) {
  return (Date.parse(time) - Date.parse(uuid)) / 1000
}

function formatTime (uuid, time) {
  return ((Date.parse(time) - Date.parse(uuid)) / 1000).toFixed(2)
}

function validRunnerUp (uuid, user, time) {
  // The runner-up must be:
  //   1) within within 2 seconds of the winning click time, and
  //   2) not the winning user, or not a user already in the runner-up list.
  const click = db.clickForUuid(uuid)
  const users = new Set(click.runnersUp.map(r => r.user))
  users.add(click.user)

  if (diffTime(click.clickTime, time) > 2.0) {
    return false
  }
  return !users.has(user)
}

function wonMessageFormatter (uuid, click) {
  const winnerClickTime = formatTime(uuid, click.clickTime)
  const runnersUpTexts = click.runnersUp.map(r => `<@${r.user}> (${formatTime(uuid, r.clickTime)} s)`)

  const attachments = [
    {
      text: `:heavy_check_mark: <@${click.user}> won (${winnerClickTime} s)!`,
      ...(click.runnersUp.length > 0 && { footer: runnersUpTexts.join(', ') + ' was close!' })
    }
  ]
  const wonMessage = {
    text: '*A wild BUTTON appears!*',
    attachments: attachments
  }
  return wonMessage
}

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
