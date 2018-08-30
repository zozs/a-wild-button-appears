const db = require('./db')

function formatTime (uuid, time) {
  return ((Date.parse(time) - Date.parse(uuid)) / 1000).toFixed(2)
}

function wonMessageFormatter (uuid, click) {
  const winnerClickTime = formatTime(uuid, click.clickTime)
  const runnersUpTexts = click.runnersUp.map(r => `<@${r.user}> (${formatTime(uuid, r.clickTime)} s)`)

  const attachments = [
    {
      text: `:heavy_check_mark: <@${click.user}> won (${winnerClickTime} s)!`,
      ...(click.runnersUp.length > 0 && {footer: runnersUpTexts.join(', ') + ' were close!'})
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
    } else {
      // We have a runner-up! Record this fact in the database as well.
      const clickData = await db.addRunnerUp(uuid, user, now)
      res.send(wonMessageFormatter(uuid, clickData))
      console.info(`${now}: ${user}: Runner-up! The button was clicked several times before update.`)
    }
  } catch (e) {
    console.error('Failed to register click. Got error:', e)
  }
}
