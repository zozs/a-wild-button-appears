/* global beforeEach, jest, describe, expect, test */

const install = require('./install')

const db = require('./db')
const { WebClient, mockAccess } = require('@slack/web-api')

jest.mock('./db')
jest.mock('@slack/web-api')

beforeEach(() => {
  // Clear all instances and calls to constructor and all methods
  WebClient.mockClear()
  mockAccess.mockClear()
  db.installInstance.mockClear()
})

const okResponse = {
  ok: true,
  access_token: 'xoxb-17653672481-19874698323-pdFZKVeTuE8sk7oOcBrzbqgy',
  token_type: 'bot',
  scope: 'commands,incoming-webhook',
  bot_user_id: 'U0KRQLJ9H',
  app_id: 'A0KRD7HC3',
  team: {
    name: 'Slack Softball Team',
    id: 'T9TK3CUKW'
  },
  enterprise: {
    name: 'slack-sports',
    id: 'E12345678'
  },
  authed_user: {
    id: 'U1234',
    scope: 'chat:write',
    access_token: 'xoxp-1234',
    token_type: 'user'
  },
  incoming_webhook: {
    channel: '#somechannel',
    channel_id: 'C12341234',
    url: 'https://hooks.slack.com/TXXXXX/BXXXXX/XXXXXXXXXX'
  }
}

describe('install redirect', () => {
  test('to try to get token and have code, id, and secret', async () => {
    mockAccess.mockImplementation(async d => okResponse)
    await install('testcode')
    expect(WebClient).toHaveBeenCalledTimes(1)
    expect(mockAccess).toHaveBeenCalledTimes(1)
    expect(mockAccess.mock.calls[0][0]).toHaveProperty('code', 'testcode')
    expect(mockAccess.mock.calls[0][0]).toHaveProperty('client_id', process.env.SLACK_CLIENT_ID)
    expect(mockAccess.mock.calls[0][0]).toHaveProperty('client_secret', process.env.SLACK_CLIENT_SECRET)
  })

  test('tries to save webhook in database after successful install', async () => {
    mockAccess.mockImplementation(async d => okResponse)

    await install('testcode')
    expect(WebClient).toHaveBeenCalledTimes(1)
    expect(mockAccess).toHaveBeenCalledTimes(1)
    expect(db.installInstance).toHaveBeenCalledTimes(1)
    expect(db.installInstance.mock.calls[0][0]).toHaveProperty('webhook', okResponse.incoming_webhook.url)
  })

  test('fails when code is undefined', async () => {
    expect(install(undefined)).rejects.toThrow(/code must be defined/)
    expect(WebClient).not.toHaveBeenCalled()
    expect(mockAccess).not.toHaveBeenCalled()
  })

  test('fails when code is invalid', async () => {
    mockAccess.mockImplementation(async d => { throw new Error('invalid_code') })

    expect(install('testcode')).rejects.toThrow(/invalid_code/)
    expect(WebClient).toHaveBeenCalledTimes(1)
    expect(mockAccess).toHaveBeenCalledTimes(1)
  })
})
