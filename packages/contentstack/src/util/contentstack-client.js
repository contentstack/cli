// eslint-disable-next-line node/no-unpublished-require
const ContentstackMgmntSDK = require('@contentstack/management')
// const host = 'https://api.contentstack.io'

class ContentstackClient {
  constructor(host) {
    if (this.instance) {
      return this.instance
    }
    if (host.includes('https://'))
      host = host.replace('https://', '')
    this.instance = ContentstackMgmntSDK.client({host})
  }
}

module.exports = ContentstackClient
