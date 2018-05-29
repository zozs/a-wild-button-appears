const db = require('./db')

module.exports = async (res, body) => {
  try {
    const uuid = body.actions[0].value
    const user = body.user.id
    const now = new Date().toISOString()

    const clickTime = (Date.parse(now) - Date.parse(uuid)) / 1000

    // First ensure that someone hasn't already clicked this button.
    if (!db.isClicked(uuid)) {
      const attachments = [
        {
          text: `:heavy_check_mark: <@${user}> won (${clickTime.toFixed(2)} s)!`
        }
      ]
      const wonMessage = {
        text: '*A wild BUTTON appears!*',
        attachments: attachments
      }
      res.send(wonMessage)

      // Now record the winner in the database.
      await db.setClicked(uuid, user, now)
      console.debug('Recorded successful click!')
    } else {
      res.send('')
      console.warn('Someone clicked the button multiple times!')
    }
  } catch (e) {
    console.error('Failed to register click. Got error:', e)
  }
}
