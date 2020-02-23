/* global beforeEach, jest, describe, expect, test */

const slack = require('./slack')

const { DateTime } = require('luxon')
const { WebClient, mockScheduleMessage } = require('@slack/web-api')
const { IncomingWebhook, mockSend } = require('@slack/webhook')

jest.mock('@slack/web-api')

const testInstance = {
  // id: 0,
  name: 'test instance',
  accessToken: 'xoxp-1234',
  signingSecret: 'TESTtoken',
  team: 'T00000000',
  channel: 'C00000000',
  manualAnnounce: false,
  weekdays: 0b1111100, // monday - friday
  intervalStart: 32400, // 09:00
  intervalEnd: 57600, // 16:00
  timezone: 'Europe/Copenhagen'
}

beforeEach(() => {
  // Clear all instances and calls to constructor and all methods
  WebClient.mockClear()
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
})
