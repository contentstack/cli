'use strict'

const {mapObject, actionMapper, requests} = require('./constants')

exports.getMapInstance = () => {
  return mapObject
}

exports.get = (id, mapInstance, data = []) => {
  // Create key if does not exist
  let __data = mapInstance.get(id)

  if (!__data) {
    mapInstance.set(id, data)
    __data = mapInstance.get(id)
  }

  return __data
}

exports.set = (id, mapInstance, data) => {
  return mapInstance.set(id, data)
}

exports.remove = (id, mapInstance) => {
  return mapInstance.delete(id)
}

exports.getDataWithAction = (id, mapInstance, action) => {
  let data = this.get(id, mapInstance)
  data = data[action]
  return data
}

exports.resetMapInstance = mapInstance => {
  this.set(actionMapper, mapInstance, [])
  this.set(requests, mapInstance, [])
}

exports.delete = () => { }
