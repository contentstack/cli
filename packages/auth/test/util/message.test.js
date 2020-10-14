const {assert} = require('chai')
const {test} = require('@oclif/test')
const Messages = require('../../src/util/messages')

describe('Messages Util', () => {
  test
  .it('Should fetch messages for "add" topic', async () => {
    const messages = new Messages('add').msgs
    assert.equal(messages.promptTokenAlias, 'Provide alias to store token')
  })

  test
  .it('Should do string interpolation and replace char %s from message', async () => {
    const messages = new Messages('add').msgs
    let msg = Messages.parse(messages.msgAddTokenSuccess, 'dummyToken')
    assert.equal(msg, '"dummyToken" token added successfully!')
  })

  test
  .it('Should do string interpolation and replace char %s from message', async () => {
    const messages = new Messages('add').msgs
    let msg = Messages.parse(messages.msgAddTokenSuccess)
    assert.equal(msg, '"%s" token added successfully!')
  })
})
