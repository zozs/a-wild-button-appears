/* global beforeEach, jest, describe, expect, test */

const slack = require('../slack')

const { Instance } = require('../__mocks__/instance')

const { DateTime } = require('luxon')
const { WebClient, mockDeleteScheduledMessage, mockJoin, mockOpen, mockPostMessage, mockPublish, mockScheduleMessage } = require('@slack/web-api')
const { IncomingWebhook, mockSend } = require('@slack/webhook')

jest.mock('@slack/web-api')

const testInstance = new Instance()

beforeEach(() => {
  // Clear all instances and calls to constructor and all methods
  IncomingWebhook.mockClear()
  WebClient.mockClear()
  mockJoin.mockClear()
  mockOpen.mockClear()
  mockPostMessage.mockClear()
  mockPublish.mockClear()
  mockScheduleMessage.mockClear()
})

describe('slack api', () => {
  test('publishes a view', async () => {
    const user = 'U1337'
    const view = {}
    await slack.publishView(testInstance, user, view)
    expect(WebClient).toHaveBeenCalledTimes(1)
    expect(mockPublish).toHaveBeenCalledTimes(1)
    expect(mockPublish.mock.calls[0][0]).toHaveProperty('user_id', user)
  })

  test('schedules a message and returns scheduled message id', async () => {
    const t = DateTime.local()
    const data = {}
    const result = await slack.scheduleMessage(testInstance, t, data)
    expect(WebClient).toHaveBeenCalledTimes(1)
    expect(mockScheduleMessage.mock.calls.length).toBe(1)
    expect(result).toHaveProperty('scheduled_message_id')
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

  test('schedules a message to a channel bot is not in', async () => {
    mockScheduleMessage.mockRejectedValueOnce({ data: { ok: false, error: 'not_in_channel' } })

    const t = DateTime.local()
    const data = {}
    try {
      await slack.scheduleMessage(testInstance, t, data)
    } catch (err) {
      console.log(`should not throw ${err} JSON: ${JSON.stringify(err)}`)
      expect(err).toBe(undefined)
    }
    expect(WebClient).toHaveBeenCalledTimes(1)
    expect(mockJoin).toHaveBeenCalledTimes(1)
    expect(mockJoin.mock.calls[0][0]).toHaveProperty('channel', testInstance.channel)
    expect(mockScheduleMessage).toHaveBeenCalledTimes(2)
    expect(mockScheduleMessage.mock.calls[0][0]).toHaveProperty('post_at', Math.floor(t.toSeconds()))
    expect(mockScheduleMessage.mock.calls[1][0]).toHaveProperty('post_at', Math.floor(t.toSeconds()))
  })

  test('deletes a scheduled message', async () => {
    await slack.unscheduleMessage(testInstance, 'testid', 'channel')
    expect(WebClient).toHaveBeenCalledTimes(1)
    expect(mockDeleteScheduledMessage).toHaveBeenCalledTimes(1)
    expect(mockDeleteScheduledMessage.mock.calls[0][0]).toHaveProperty('channel', 'channel')
    expect(mockDeleteScheduledMessage.mock.calls[0][0]).toHaveProperty('scheduled_message_id', 'testid')
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
