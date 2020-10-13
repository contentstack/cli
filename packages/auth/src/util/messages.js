const messages  = require('../../messages/index.json')

class Messages {
  constructor(type) {
    this.msgs = messages[type]
  }

  static parse(msg, ...substitutions) {
    if (substitutions.length > 0) {
      let callSite = msg.split('%s')
      callSite.push('')
      return String.raw({raw: callSite}, ...substitutions)
    }
    return msg
  }
}

module.exports = Messages
