/* global describe, expect, jest, test */

// mock most things since we don't want the top-level statements to do anything.
jest.mock('node-schedule')
jest.mock('../announces')
jest.mock('../click')
jest.mock('../db')
jest.mock('../slack')
jest.mock('../wildbutton')

// global mocks to handle top-level statement execution.
const wildbuttonApp = require('../wildbutton')
let clickRecorderHandler
wildbuttonApp.mockImplementation((handler) => {
  // will store a refrence to the handler without exporting it.
  clickRecorderHandler = handler
  return {
    listen: jest.fn()
  }
})

const { clickRecorder } = require('../click')
const { click } = jest.requireActual('../click')

require('../handler-standalone')

describe('handler-standalone', () => {
  describe('clickRecorderHandler', () => {
    test('causes acknowledgement before click recording', async () => {
      const res = { send: jest.fn() }
      const payload = {
        actions: [{ value: '' }],
        team: { id: '' },
        user: { id: '' },
        response_url: ''
      }

      await click(res, payload, clickRecorderHandler)

      // we need to wait here since with deferred execution of clickRecorder, so if we
      // start checking assertions too early clickRecorder might not have been called yet.
      await new Promise(resolve => setTimeout(() => resolve(), 500))

      expect(res.send).toHaveBeenCalledTimes(1)
      expect(clickRecorder).toHaveBeenCalledTimes(1)
      expect(res.send).toHaveBeenCalledBefore(clickRecorder)
    })
  })
})
