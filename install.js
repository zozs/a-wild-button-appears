const db = require('./db')
const slack = require('./slack')

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
    redirect_uri: process.env.SLACK_REDIRECT_URI,
    code
  })

  // Store stuff in database.
  const instance = await db.installInstance({
    accessToken: result.access_token,
    scope: result.scope,
    botUserId: result.bot_user_id,
    appId: result.app_id,
    team: result.team,
    authedUser: result.authed_user
  })

  // tell user how configuration should be done by sending an IM to the installing user.
  await slack.sendImToUser(instance, instance.authedUser.id, {
    text: "Hi! I'm wildbutton! To configure me, do something."
  })
}
