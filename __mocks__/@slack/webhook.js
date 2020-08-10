/* global jest */

const mockSend = jest.fn()

const mock = jest.fn().mockImplementation(() => {
  return {
    send: mockSend
  }
})

module.exports = {
  IncomingWebhook: mock,
  mockSend
}
