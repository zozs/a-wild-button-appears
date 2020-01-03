const crypto = require('crypto')
const createError = require('http-errors')
const db = require('./db')

module.exports = {
  slackVerify: (req, res, next) => {
    if (req.slack === undefined) {
      console.error('No slack object on request! Missing slack-request-extract middleware?')
      return next(createError(403, 'Request is missing Slack object on request object.'))
    }

    const { version, requestTimestamp, body, hash } = req.slack
    // const team = req.body.team.id || req.body.team // TODO: old one, but this cannot work?
    const team = req.body.team_id
    if (team === undefined) {
      console.error('No Slack team in request object!')
      return next(createError(400, 'Request object is missing Slack team.'))
    }
    req.slack.team = team

    db.signingSecret(team)
      .then(signingSecret => {
        const hmac = crypto.createHmac('sha256', signingSecret)
        hmac.update(`${version}:${requestTimestamp}:${body}`)

        if (hash !== hmac.digest('hex')) {
          console.error('Invalid signature on request!')
          return next(createError(403, 'Slack request signing verification failed'))
        }
        next()
      })
      .catch(e => {
        next(createError(400, 'No such team-id in database. Request cannot be verified!'))
      })
  }
}
