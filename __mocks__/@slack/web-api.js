/* global jest */

const mockAccess = jest.fn()
const mockDeleteScheduledMessage = jest.fn()
const mockJoin = jest.fn()
const mockOpen = jest.fn()
const mockPostMessage = jest.fn()
const mockPublish = jest.fn()
const mockScheduleMessage = jest.fn(async () => ({
  ok: true,
  scheduled_message_id: 'Q1298393284'
}))

const mock = jest.fn().mockImplementation(() => {
  return {
    chat: {
      deleteScheduledMessage: mockDeleteScheduledMessage,
      postMessage: mockPostMessage,
      scheduleMessage: mockScheduleMessage
    },
    conversations: {
      join: mockJoin,
      open: mockOpen
    },
    oauth: {
      v2: {
        access: mockAccess
      }
    },
    views: {
      publish: mockPublish
    }
  }
})

module.exports = {
  WebClient: mock,
  mockAccess,
  mockDeleteScheduledMessage,
  mockJoin,
  mockOpen,
  mockPostMessage,
  mockPublish,
  mockScheduleMessage
}
