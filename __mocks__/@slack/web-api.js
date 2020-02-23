/* global jest */

const mockAccess = jest.fn()
const mockOpen = jest.fn()
const mockPostMessage = jest.fn()
const mockScheduleMessage = jest.fn()

const mock = jest.fn().mockImplementation(() => {
  return {
    chat: {
      postMessage: mockPostMessage,
      scheduleMessage: mockScheduleMessage
    },
    conversations: {
      open: mockOpen
    },
    oauth: {
      v2: {
        access: mockAccess
      }
    }
  }
})

module.exports = {
  WebClient: mock,
  mockAccess,
  mockOpen,
  mockPostMessage,
  mockScheduleMessage
}
