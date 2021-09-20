'use strict'

// Dependencies
const {request} = require('https')
const {stringify, parse} = JSON

// Map helper
const {getMapInstance, getDataWithAction} = require('./map')

// constants
const {actions, nonWritableMethods} = require('./constants')

// Properties
const {DELETE_CT} = actions

module.exports = ({
  hostname,
  path,
  headers,
  method,
  id,
  action,
}) => {
  let options = {
    hostname,
    path,
    headers,
    method,
    id,
    action,
  }
  return _data => {
    // get data here using id and action
    let data = getData(_data, id, action, method)
    // Special handling for non writable methods
    options = getNewOptions(options, data, action, method)

    return new Promise((resolve, reject) => {
      const req = request(options, res => {
        let response = ''

        res.on('data', _res => {
          response += _res.toString()
        })

        res.on('end', () => {
          try {
            response = parse(response)
            resolve(response)
          } catch (err) {
            reject('Error while parsing response!')
            // throw new Error('Error while parsing response!');
          }
        })
      })

      req.on('error', err => {
        reject(err)
      })

      !nonWritableMethods.includes(method) && req.write(data)
      req.end()
    })
  }
}

function getData(_data, id, action, method) {
  if (method === 'GET') return
  // if (!nonWritableMethods.includes(method)) {
  let mapInstance = getMapInstance()

  let data = _data ? _data : getDataWithAction(id, mapInstance, action)
  return stringify(data)
}

function getNewOptions(options, data, action, method) {
  // Special handling for delete method
  if (action === DELETE_CT) {
    try {
      data = parse(data)
    } catch (err) {
      throw 'Error while parsing data for delete operation'
    }
    options.path = `${options.path}?force=${data.content_type.force}`
  }

  if (!nonWritableMethods.includes(method)) {
    options.headers['Content-Length'] = data.length
  } else {
    delete options.headers['Content-Type']
    delete options.headers['Content-Length']
  }

  return options
}
