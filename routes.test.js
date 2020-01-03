/* global jest, describe, expect, test */

const request = require('supertest')
const app = require('./wildbutton')

jest.mock('./db')
jest.mock('./slack-request-verifier')

function commandRequest (app) {
  return request(app)
    .post('/commands')
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('X-Slack-Signature', 'INVALID')
    .set('X-Slack-Request-Timestamp', Math.floor(Date.now() / 1000))
}

describe('Test the root path', () => {
  test('It should response the GET method', async () => {
    const response = await request(app).get('/')
    expect(response.statusCode).toBe(200)
    expect(response.text).toMatch(/API is ready/)
  })
})

describe('Test help command', () => {
  test('It should respond.', async () => {
    const response = await commandRequest(app)
      .send({
        text: 'help',
        team_id: 'TESTTEAMID'
      })
    expect(response.statusCode).toBe(200)
    expect(response.text).toMatch(/totally useless/)
  })
})
