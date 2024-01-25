/* global beforeEach, describe, expect, jest, test */

const { click, clickRecorder } = require('../click')

const db = require('../db')
const slack = require('../slack')

const { DateTime } = require('luxon')

jest.mock('../db')
jest.mock('../slack')

const clickMockResponseUrl = 'https://hooks.slack.com/actions/AABA1ABCD/a/b'
const clickMockUuid = '2020-02-01T15:30:20.686Z'

const clickMockPayload = {
  type: 'block_actions',
  team: {
    id: 'T9TK3CUKW',
    domain: 'example'
  },
  user: {
    id: 'UA8RXUSPL',
    username: 'jtorrance',
    team_id: 'T9TK3CUKW'
  },
  api_app_id: 'AABA1ABCD',
  token: 'okokokoko',
  container: {
    type: 'message_attachment',
    message_ts: '1548261231.000200',
    attachment_id: 1,
    channel_id: 'CBR2V3XEX',
    is_ephemeral: false,
    is_app_unfurl: false
  },
  trigger_id: '12321423423.333649436676.d8c1bb837935619ccad0f624c448ffb3',
  channel: {
    id: 'CBR2V3XEX',
    name: 'review-updates'
  },
  message: {
    bot_id: 'BAH5CA16Z',
    type: 'message',
    text: "This content can't be displayed.",
    user: 'UAJ2RU415',
    ts: '1548261231.000200'
  },
  response_url: clickMockResponseUrl,
  actions: [
    {
      action_id: 'WaXA',
      block_id: '=qXel',
      text: {
        type: 'plain_text',
        text: 'Click me',
        emoji: true
      },
      value: clickMockUuid,
      type: 'button',
      action_ts: '1548426417.840580'
    }
  ]
}

describe('click handler to', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // reduces waiting time for runnings test.
    Object.assign(process.env, {
      RUNNER_UP_WINDOW: '20',
      CONSISTENCY_TIME: '10'
    })
  })

  test('acknowledge click', async () => {
    const resMock = { send: jest.fn(x => null) }
    const handlerMock = jest.fn()

    await click(resMock, clickMockPayload, handlerMock)

    expect(resMock.send).toHaveBeenCalledTimes(1)
    expect(handlerMock).toHaveBeenCalledTimes(1)
    expect(handlerMock).toHaveBeenCalledBefore(resMock.send)
  })

  test('use action_ts as timestamp', async () => {
    const resMock = { send: jest.fn(x => null) }
    const handlerMock = jest.fn()

    await click(resMock, clickMockPayload, handlerMock)

    expect(resMock.send).toHaveBeenCalledTimes(1)
    expect(handlerMock).toHaveBeenCalledTimes(1)
    expect(handlerMock).toHaveBeenCalledBefore(resMock.send)
    const expected = DateTime.fromISO('2019-01-25T14:26:57.841Z')
    const actual = handlerMock.mock.calls[0][0].timestamp
    expect(actual).toEqual(expected.toISO())
  })

  test('send determining message on first click', async () => {
    const clickObject = {
      instanceRef: clickMockPayload.team.id,
      uuid: clickMockUuid,
      timestamp: DateTime.local(),
      user: clickMockPayload.user.id,
      responseUrl: clickMockResponseUrl
    }

    await clickRecorder(clickObject)

    expect(slack.sendReplacingResponse).toHaveBeenCalledTimes(2)
  })

  test('not send determining message on second click', async () => {
    db.recordClick.mockImplementationOnce(async () => false)

    const clickObject = {
      instanceRef: clickMockPayload.team.id,
      uuid: clickMockUuid,
      timestamp: DateTime.local(),
      user: clickMockPayload.user.id,
      responseUrl: clickMockResponseUrl
    }

    await clickRecorder(clickObject)

    expect(slack.sendReplacingResponse).toHaveBeenCalledTimes(1)
  })

  test('to send to response url', async () => {
    const clickObject = {
      instanceRef: clickMockPayload.team.id,
      uuid: clickMockUuid,
      timestamp: DateTime.local(),
      user: clickMockPayload.user.id,
      responseUrl: clickMockResponseUrl
    }

    await clickRecorder(clickObject)

    expect(slack.sendReplacingResponse).toHaveBeenCalledTimes(2)
    expect(slack.sendReplacingResponse.mock.calls[1][0]).toBe(clickMockResponseUrl)
  })

  test('correctly calculate the winning time and post it', async () => {
    const clickObject = {
      instanceRef: clickMockPayload.team.id,
      uuid: clickMockUuid,
      timestamp: DateTime.fromISO('2020-02-01T15:31:21.800Z'), // 61.114 s difference.
      user: clickMockPayload.user.id,
      responseUrl: clickMockResponseUrl
    }

    const mockClicksData = {
      clicks: [
        {
          user: clickMockPayload.user.id,
          timestamp: DateTime.fromISO('2020-02-01T15:31:21.800Z').toBSON() // 61.114 s difference.
        }
      ]
    }

    db.clickData
      .mockImplementationOnce(async () => mockClicksData)
      .mockImplementationOnce(async () => mockClicksData)

    await clickRecorder(clickObject)

    expect(slack.sendReplacingResponse.mock.calls[1][0]).toBe(clickMockResponseUrl)
    expect(JSON.stringify(slack.sendReplacingResponse.mock.calls[1][1])).toMatch(/61\.11 s/)
  })

  test('correctly calculate the winning time and runner up and post it', async () => {
    const clickObject = {
      instanceRef: clickMockPayload.team.id,
      uuid: clickMockUuid,
      timestamp: DateTime.fromISO('2020-02-01T15:31:21.800Z'), // 61.114 s difference.
      user: clickMockPayload.user.id,
      responseUrl: clickMockResponseUrl
    }

    const mockClicksData = {
      clicks: [
        {
          user: clickMockPayload.user.id,
          timestamp: DateTime.fromISO('2020-02-01T15:31:21.800Z').toBSON() // 61.114 s difference.
        },
        {
          user: 'otheruser',
          timestamp: DateTime.fromISO('2020-02-01T15:31:22.801Z').toBSON() // 62.115 s difference.
        }
      ]
    }

    db.clickData
      .mockImplementationOnce(async () => mockClicksData)
      .mockImplementationOnce(async () => mockClicksData)

    await clickRecorder(clickObject)

    expect(slack.sendReplacingResponse.mock.calls[1][0]).toBe(clickMockResponseUrl)
    expect(JSON.stringify(slack.sendReplacingResponse.mock.calls[1][1])).toMatch(/<@UA8RXUSPL> won \(61.11 s\)/)
    expect(JSON.stringify(slack.sendReplacingResponse.mock.calls[1][1])).toMatch(/<@otheruser> \(62.12 s\) was close/)
    expect(JSON.stringify(slack.sendReplacingResponse.mock.calls[1][1])).toMatch(/61\.11 s/)
    expect(JSON.stringify(slack.sendReplacingResponse.mock.calls[1][1])).toMatch(/62\.12 s/)
  })

  test('correctly calculate the winning time and runner up and post it with millisecond difference', async () => {
    const clickObject = {
      instanceRef: clickMockPayload.team.id,
      uuid: clickMockUuid,
      timestamp: DateTime.fromISO('2020-02-01T15:30:24.800Z'), // 4.114 s difference.
      user: clickMockPayload.user.id,
      responseUrl: clickMockResponseUrl
    }

    const mockClicksData = {
      clicks: [
        {
          user: clickMockPayload.user.id,
          timestamp: DateTime.fromISO('2020-02-01T15:30:24.799Z').toBSON() // 4.113 s difference.
        },
        {
          user: 'otheruser',
          timestamp: DateTime.fromISO('2020-02-01T15:30:24.800Z').toBSON() // 4.114 s difference.
        },
        {
          user: 'otheruser',
          timestamp: DateTime.fromISO('2020-02-01T15:30:24.801Z').toBSON() // 4.115 s difference.
        }
      ]
    }

    db.clickData
      .mockImplementationOnce(async () => mockClicksData)
      .mockImplementationOnce(async () => mockClicksData)

    await clickRecorder(clickObject)

    expect(slack.sendReplacingResponse.mock.calls[1][0]).toBe(clickMockResponseUrl)
    expect(JSON.stringify(slack.sendReplacingResponse.mock.calls[1][1])).toMatch(/<@UA8RXUSPL> won \(4.113 s\)/)
    expect(JSON.stringify(slack.sendReplacingResponse.mock.calls[1][1])).toMatch(/<@otheruser> \(4.114 s\)/)
    expect(JSON.stringify(slack.sendReplacingResponse.mock.calls[1][1])).toMatch(/<@otheruser> \(4.12 s\) were close/)
    expect(JSON.stringify(slack.sendReplacingResponse.mock.calls[1][1])).toMatch(/4\.113 s/)
    expect(JSON.stringify(slack.sendReplacingResponse.mock.calls[1][1])).toMatch(/4\.114 s/)
    expect(JSON.stringify(slack.sendReplacingResponse.mock.calls[1][1])).toMatch(/4\.12 s/)
  })
})
