/* global jest */

const mockPostMessage = jest.fn()
const mockScheduleMessage = jest.fn()

const mock = jest.fn().mockImplementation(() => {
  return {
    chat: {
      postMessage: mockPostMessage,
      scheduleMessage: mockScheduleMessage
    }
  }
})

module.exports = {
  WebClient: mock,
  mockPostMessage,
  mockScheduleMessage
}
