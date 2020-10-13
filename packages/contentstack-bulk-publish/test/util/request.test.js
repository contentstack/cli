const nock = require('nock')
const assert = require('assert')
const req = require('../../src/util/request')

describe('testing request module', () => {
  // const mockedlog = () => {}

  beforeEach(() => {
    // console.log = mockedlog
    nock('https://api.localhost.io')
    .get('/test')
    .reply(200, {message: 'successful'})

    nock('https://api.localhost.io')
    .get('/fourtwentynine')
    .reply(429, {message: 'limit exceeded'})

    nock('https://api.localhost.io')
    .get('/greaterthan500')
    .reply(501, {message: 'greater than 500'})

    nock('https://api.localhost.io')
    .get('/thisroutefails')
    .reply(404, {message: 'this route fails'})
  })

  it('testing request function', async () => {
    const config = {
      uri: 'https://api.localhost.io/test',
      method: 'GET',
    }
    return req(config).then(response => {
      assert.strictEqual(response.message, 'successful')
    })
  })

  it('testing request function with more than max retries', async () => {
    const config = {
      uri: 'https://api.localhost.io/test/',
      method: 'GET',
    }

    return req(config, 9).
    catch(error => {
      assert(error.message, 'Max retry limit exceeded!')
    })
  })

  it('testing request function with response code 429', async () => {
    const config = {
      uri: 'https://api.localhost.io/fourtwentynine/',
      method: 'GET',
    }

    return req(config).catch(error => {
      assert(error)
    })

    // await expect(req(config)).rejects.toThrow()
  })

  it('testing request function with response code greater than 500', async () => {
    const config = {
      uri: 'https://api.localhost.io/greaterthan500/',
      method: 'GET',
    }

    return req(config).catch(error => {
      assert(error)
    })

    // await expect(req(config)).rejects.toThrow()
  })

  it('testing request function with error', async () => {
    const config = {
      uri: 'https://api.localhost.io/thisroutefails/',
      method: 'GET',
    }

    return req(config).catch(error => {
      assert(error)
    })

    // const response = req(config)
    // await expect(response).rejects.toMatch(JSON.stringify({message: 'this route fails'}))
  })
})
