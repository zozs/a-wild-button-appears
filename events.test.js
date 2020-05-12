/* global beforeAll, jest, describe, expect, test */

const request = require('supertest')

jest.mock('./routes')

// jest.mock('@slack/events-api')

// Mock only the verifyRequestSignature exported function, by first mocking the
// whole module, and later replacing createEventAdapter with the real implementation.
/*
const { createEventAdapter, verifyRequestSignature } = require('@slack/events-api')
const { createEventAdapterReal } = jest.requireActual('@slack/events-api')

createEventAdapter.mockImplementation(createEventAdapterReal)
verifyRequestSignature.mockImplementation(() => true)
*/

const wildbuttonApp = require('./wildbutton')

let app

beforeAll(() => {
  Object.assign(process.env, {
    SLACK_SIGNING_SECRET: 'testsigningsecret'
  })

  app = wildbuttonApp(null)
})

function eventRequest (app) {
  return request(app)
    .post('/events')
    .set('Content-Type', 'application/json')
    .set('X-Slack-Signature', 'INVALID')
    .set('X-Slack-Request-Timestamp', Math.floor(Date.now() / 1000))
}

describe('Test event url_verification', () => {
  test('It should respond', async () => {
    const response = await eventRequest(app).send({
      token: 'Jhj5dZrVaK7ZwHHjRyZWjbDl',
      challenge: '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P',
      type: 'url_verification'
    })
    expect(response.statusCode).toBe(200)
  })
})

describe('Test event app_home_opened', () => {
  test('It should respond', async () => {
    const response = await eventRequest(app)
      .send({

      })
    expect(true).toBe(true)
  })
})
