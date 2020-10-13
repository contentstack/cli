var Bluebird = require('bluebird')
var request = Bluebird.promisify(require('request'))
var debug = require('debug')('util:requests')
var MAX_RETRY_LIMIT = 5

function validate(req) {
  if (typeof req !== 'object') {
    throw new TypeError(`Invalid params passed for request\n${JSON.stringify(arguments)}`)
  }
  if (typeof req.uri === 'undefined' && typeof req.url === 'undefined') {
    throw new TypeError(`Missing uri in request!\n${JSON.stringify(req)}`)
  }
  if (typeof req.method === 'undefined') {
    debug(`${req.uri || req.url} had no method, setting it as 'GET'`)
    req.method = 'GET'
  }
  if (typeof req.json === 'undefined') {
    req.json = true
  }
}

var makeCall = function (req, RETRY) {
  return new Bluebird(function (resolve, reject) {
    try {
      validate(req)
      if (typeof RETRY !== 'number') {
        RETRY = 1
      } else if (RETRY > MAX_RETRY_LIMIT) {
        return reject(new Error('Max retry limit exceeded!'))
      }
      debug(`${req.method.toUpperCase()}: ${req.uri || req.url}`)
      return request(req).then(function (response) {
        var timeDelay
        if (response.statusCode >= 200 && response.statusCode <= 399) {
          return resolve(response)
        }
        if (response.statusCode === 429) {
          // eslint-disable-next-line unicorn/prefer-exponentiation-operator
          timeDelay = Math.pow(Math.SQRT2, RETRY) * 100
          debug(`API rate limit exceeded.\nReceived ${response.statusCode} status\nBody ${JSON.stringify(response)}`)
          debug(`Retrying ${req.uri || req.url} with ${timeDelay} sec delay`)
          return setTimeout(function (req, RETRY) {
            return makeCall(req, RETRY)
            .then(resolve)
            .catch(reject)
          }, timeDelay, req, RETRY)
        }
        if (response.statusCode >= 500) {
          // retry, with delay
          // eslint-disable-next-line unicorn/prefer-exponentiation-operator
          timeDelay = Math.pow(Math.SQRT2, RETRY) * 100
          debug(`Received ${response.statusCode} status\nBody ${JSON.stringify(response)}`)
          debug(`Retrying ${req.uri || req.url} with ${timeDelay} sec delay`)
          RETRY++
          return setTimeout(function (req, RETRY) {
            return makeCall(req, RETRY)
            .then(resolve)
            .catch(reject)
          }, timeDelay, req, RETRY)
        }
        debug(`Request failed\n${JSON.stringify(req)}`)
        return reject(response.body)
      }).catch(reject)
    } catch (error) {
      debug(error)
      return reject(error)
    }
  })
}

module.exports =  makeCall
