const db = require('./db')

const { WebClient } = require('@slack/web-api')

module.exports = async code => {
  if (code === undefined) {
    throw new Error('OAuth code must be defined!')
  }

  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET

  // Use code to get the real OAuth token.
  const result = await (new WebClient()).oauth.v2.access({
    client_id: clientId,
    client_secret: clientSecret,
    code
  })

  // Store stuff in database.
  db.installInstance({
    webhook: result.incoming_webhook.url
  })

  // result.team_id
  // result.access_token
}
