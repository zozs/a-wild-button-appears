/* global beforeEach, describe, expect, jest, test */

const click = require('./click')

const db = require('./db')
const slack = require('./slack')

jest.mock('./db')
jest.mock('./slack')

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
      action_ts: '1548426417.840180'
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

    await click(resMock, clickMockPayload)

    expect(resMock.send.mock.calls.length).toBe(1)
  })

  test('send determining message on first click', async () => {
    const resMock = { send: jest.fn(x => null) }

    await click(resMock, clickMockPayload)

    expect(slack.sendReplacingResponse).toHaveBeenCalledTimes(2)
  })

  test('not send determining message on second click', async () => {
    const resMock = { send: jest.fn(x => null) }
    db.recordClick.mockImplementationOnce(async () => false)

    await click(resMock, clickMockPayload)

    expect(slack.sendReplacingResponse.mock.calls.length).toBe(1)
    expect(slack.sendReplacingResponse).toHaveBeenCalledTimes(1)
  })

  test('to send to response url', async () => {
    const resMock = { send: jest.fn(x => null) }

    await click(resMock, clickMockPayload)

    expect(slack.sendReplacingResponse).toHaveBeenCalledTimes(2)
    expect(slack.sendReplacingResponse.mock.calls[1][0]).toBe(clickMockResponseUrl)
  })
})
