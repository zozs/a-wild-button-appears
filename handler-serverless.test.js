/* global beforeAll, describe, expect, jest, test */

// mock most things since we don't want the top-level statements to do anything.
jest.mock('aws-sdk')
jest.mock('serverless-http')
jest.mock('./announces')
jest.mock('./click')
jest.mock('./db')
jest.mock('./slack')
jest.mock('./wildbutton')

const AWS = require('aws-sdk')

// global mocks to handle top-level statement execution.
const wildbuttonApp = require('./wildbutton')
let clickRecorderHandler
wildbuttonApp.mockImplementation((handler) => {
  // will store a refrence to the handler without exporting it.
  clickRecorderHandler = handler
})

const lambdaInvokeMock = jest.fn()
AWS.Lambda.mockImplementation(() => ({
  invoke: lambdaInvokeMock
}))

const { click } = jest.requireActual('./click')

require('./handler-serverless')

beforeAll(async () => {
  Object.assign(process.env, {
    JWT_SECRET: 'test'
  })
})

describe('handler-serverless', () => {
  describe('clickRecorderHandler', () => {
    test('launches lambda before acknowledgement', async () => {
      const res = { send: jest.fn() }
      const payload = {
        actions: [{ value: '' }],
        team: { id: '' },
        user: { id: '' },
        response_url: ''
      }

      await click(res, payload, clickRecorderHandler)

      // await new Promise(resolve => setTimeout(() => resolve(), 500))

      expect(res.send).toHaveBeenCalledTimes(1)

      expect(AWS.Lambda).toHaveBeenCalledTimes(1)
      expect(lambdaInvokeMock).toHaveBeenCalledTimes(1)

      expect(res.send).toHaveBeenCalledAfter(lambdaInvokeMock)
    })
  })
})
