/* global jest */

const mockAccess = jest.fn()
const mockPostMessage = jest.fn()
const mockScheduleMessage = jest.fn()

const mock = jest.fn().mockImplementation(() => {
  return {
    chat: {
      postMessage: mockPostMessage,
      scheduleMessage: mockScheduleMessage
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
  mockPostMessage,
  mockScheduleMessage
}
