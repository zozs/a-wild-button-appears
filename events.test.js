/* global beforeAll, jest, describe, expect, test */

const crypto = require('crypto')
const request = require('supertest')

const { mockPublish } = require('@slack/web-api')

jest.mock('./routes')

const wildbuttonApp = require('./wildbutton')

let app

beforeAll(() => {
  Object.assign(process.env, {
    SLACK_SIGNING_SECRET: 'testsigningsecret'
  })

  app = wildbuttonApp(null)
})

function slackSignature (signingSecret, body) {
  const timestamp = Math.floor(Date.now() / 1000)

  const version = 'v0'
  const hmac = crypto.createHmac('sha256', signingSecret)
  hmac.update(`${version}:${timestamp}:${body}`)

  return {
    signature: `${version}=${hmac.digest('hex')}`,
    timestamp
  }
}

function eventRequest (app) {
  return {
    async send (body) {
      const bodyText = JSON.stringify(body)
      const { signature, timestamp } = slackSignature('testsigningsecret', bodyText)
      return request(app)
        .post('/events')
        .set('Content-Type', 'application/json')
        .set('X-Slack-Signature', signature)
        .set('X-Slack-Request-Timestamp', timestamp)
        .send(body)
    }
  }
}

describe('Test event url_verification', () => {
  test('It should respond', async () => {
    const response = await eventRequest(app).send({
      token: 'Jhj5dZrVaK7ZwHHjRyZWjbDl',
      challenge: '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P',
      type: 'url_verification'
    })
    expect(response.statusCode).toBe(200)
  })
})

describe('Test event app_home_opened', () => {
  test('It should respond', async () => {
    const response = await eventRequest(app)
      .send({
        token: 'XXYYZZ',
        team_id: 'TXXXXXXXX',
        api_app_id: 'AXXXXXXXXX',
        event: {
          type: 'app_home_opened',
          user: 'U061F7AUR',
          channel: 'D0LAN2Q65',
          event_ts: '1515449522000016',
          tab: 'home',
          view: {
            id: 'VPASKP233',
            team_id: 'T21312902',
            type: 'home',
            blocks: [

            ],
            private_metadata: '',
            callback_id: '',
            state: {

            },
            hash: '1231232323.12321312',
            clear_on_close: false,
            notify_on_close: false,
            root_view_id: 'VPASKP233',
            app_id: 'A21SDS90',
            external_id: '',
            app_installed_team_id: 'T21312902',
            bot_id: 'BSDKSAO2'
          }
        },
        type: 'event_callback',
        authed_users: [
          'UXXXXXXX1',
          'UXXXXXXX2'
        ],
        event_id: 'Ev08MFMKH6',
        event_time: 1234567890
      })
    expect(response.status).toBe(200)
    expect(mockPublish).toHaveBeenCalledTimes(1)
  })
})
