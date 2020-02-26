/* global beforeEach, jest, describe, expect, test */

const slack = require('./slack')

const { Instance } = require('./instance')

const { DateTime } = require('luxon')
const { WebClient, mockOpen, mockPostMessage, mockScheduleMessage } = require('@slack/web-api')
const { IncomingWebhook, mockSend } = require('@slack/webhook')

jest.mock('./instance')
jest.mock('@slack/web-api')

const testInstance = new Instance()

beforeEach(() => {
  // Clear all instances and calls to constructor and all methods
  IncomingWebhook.mockClear()
  WebClient.mockClear()
  mockOpen.mockClear()
  mockPostMessage.mockClear()
  mockScheduleMessage.mockClear()
})

describe('slack api', () => {
  test('schedules a message', async () => {
    const t = DateTime.local()
    const data = {}
    await slack.scheduleMessage(testInstance, t, data)
    expect(WebClient).toHaveBeenCalledTimes(1)
    expect(mockScheduleMessage.mock.calls.length).toBe(1)
  })

  test('schedules a message with a channel parameter', async () => {
    const t = DateTime.local()
    const data = {}
    await slack.scheduleMessage(testInstance, t, data)
    expect(WebClient).toHaveBeenCalledTimes(1)
    expect(mockScheduleMessage).toHaveBeenCalledTimes(1)
    expect(mockScheduleMessage.mock.calls[0][0]).toHaveProperty('channel', testInstance.channel)
  })

  test('schedules a message with a post_at parameter', async () => {
    const t = DateTime.local()
    const data = {}
    await slack.scheduleMessage(testInstance, t, data)
    expect(WebClient).toHaveBeenCalledTimes(1)
    expect(mockScheduleMessage).toHaveBeenCalledTimes(1)
    expect(mockScheduleMessage.mock.calls[0][0]).toHaveProperty('post_at', Math.floor(t.toSeconds()))
  })

  test('replacing response has replace_original set', async () => {
    const url = 'https://test.example.com/hook'
    const data = {}
    await slack.sendReplacingResponse(url, data)
    expect(IncomingWebhook).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend.mock.calls[0][0]).toHaveProperty('replace_original', true)
  })

  test('send im to user first opens conversation, then sends message to it', async () => {
    const user = 'U1234'
    const data = { text: 'hej' }

    mockOpen.mockImplementation(async d => ({ channel: { id: 'D5678' } }))

    await slack.sendImToUser(testInstance, user, data)
    expect(WebClient).toHaveBeenCalledTimes(1)
    expect(mockOpen).toHaveBeenCalledTimes(1)
    expect(mockOpen.mock.calls[0][0]).toHaveProperty('users', user)

    expect(mockPostMessage).toHaveBeenCalledTimes(1)
    expect(mockPostMessage.mock.calls[0][0]).toHaveProperty('channel', 'D5678')
  })
})
