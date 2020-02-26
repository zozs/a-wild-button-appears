/* global beforeEach, jest, describe, expect, test */

const install = require('./install')

const db = require('./db')
const slack = require('./slack')
const { WebClient, mockAccess } = require('@slack/web-api')
const { Instance } = require('./instance')

jest.mock('./db')
jest.mock('./instance')
jest.mock('@slack/web-api')
jest.mock('./slack')

beforeEach(() => {
  // Clear all instances and calls to constructor and all methods
  WebClient.mockClear()
  mockAccess.mockClear()
  db.installInstance.mockClear()
  slack.sendImToUser.mockClear()

  // sets test variables to env.
  Object.assign(process.env, {
    SLACK_CLIENT_ID: '1010101010',
    SLACK_CLIENT_SECRET: 'hemliz',
    SLACK_REDIRECT_URI: 'https://example.com/auth'
  })
})

const okResponse = {
  ok: true,
  access_token: 'xoxb-17653672481-19874698323-pdFZKVeTuE8sk7oOcBrzbqgy',
  token_type: 'bot',
  scope: 'commands,incoming-webhook',
  bot_user_id: 'U0KRQLJ9H',
  app_id: 'A0KRD7HC3',
  team: {
    name: 'Test team',
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
  }
}

const testInstance = new Instance()

describe('install redirect', () => {
  test('to try to get token and have code, id, and secret', async () => {
    mockAccess.mockImplementation(async d => okResponse)
    db.installInstance.mockImplementation(async d => testInstance)

    await install('testcode')
    expect(WebClient).toHaveBeenCalledTimes(1)
    expect(mockAccess).toHaveBeenCalledTimes(1)
    expect(mockAccess.mock.calls[0][0]).toHaveProperty('code', 'testcode')
    expect(mockAccess.mock.calls[0][0]).toHaveProperty('client_id', process.env.SLACK_CLIENT_ID)
    expect(mockAccess.mock.calls[0][0]).toHaveProperty('client_secret', process.env.SLACK_CLIENT_SECRET)
    expect(mockAccess.mock.calls[0][0]).toHaveProperty('redirect_uri', process.env.SLACK_REDIRECT_URI)
  })

  test('tries to save access token in database after successful install', async () => {
    mockAccess.mockImplementation(async d => okResponse)

    await install('testcode')
    expect(WebClient).toHaveBeenCalledTimes(1)
    expect(mockAccess).toHaveBeenCalledTimes(1)
    expect(db.installInstance).toHaveBeenCalledTimes(1)
    expect(db.installInstance.mock.calls[0][0]).toHaveProperty('accessToken', okResponse.access_token)
  })

  test('sends welcome message to installing user after successful install', async () => {
    mockAccess.mockImplementation(async d => okResponse)

    await install('testcode')
    expect(WebClient).toHaveBeenCalledTimes(1)
    expect(mockAccess).toHaveBeenCalledTimes(1)
    expect(slack.sendImToUser).toHaveBeenCalledTimes(1)
    expect(slack.sendImToUser.mock.calls[0][0]).toHaveProperty('accessToken', okResponse.access_token)
    expect(slack.sendImToUser.mock.calls[0][1]).toBe(okResponse.authed_user.id)
    expect(slack.sendImToUser.mock.calls[0][2]).toHaveProperty('text')
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
