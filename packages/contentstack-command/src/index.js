const {Command, flags} = require('@oclif/command')
const ContentstackManagementSDK = require('@contentstack/management')
const ContentstackDeliverySDK = require('contentstack')
const {TokenNotFound, NotLoggedIn} = require('./custom-errors')
const Configstore = require('configstore')
const config = new Configstore('contentstack_cli')
const url = require('url')
const defaultRegion = {cma: 'https://api.contentstack.io', cda: 'https://cdn.contentstack.io', name: 'NA'}
const defaultRateLimit = 5

class ContentstackCommand extends Command {
  get managementAPIClient() {
    if (this._managementAPIClient) return this._managementAPIClient
    this._managementAPIClient = ContentstackManagementSDK.client({host: this.cmaHost})
    return this._managementAPIClient
  }

  set managementAPIClient(params) {
    if (params && params.host) {
      // can not set host explicitly as CLI runs under constant host coming from config
      params.host = this.cmaHost
    } else {
      params.host = this.cmaHost
    }
    this._managementAPIClient = ContentstackManagementSDK.client(params)
  }

  get email() {
    if (this._email) return this._email
    this._email = config.get('email')
    if (this._email) return this._email
    throw new NotLoggedIn()
  }

  get deliveryAPIClient() {
    if (this._deliveryAPIClient) return this._deliveryAPIClient
    this._deliveryAPIClient = ContentstackDeliverySDK
    return this._deliveryAPIClient
  }

  get region() {
    if (this._region) return this._region
    this._region = config.get('region')
    if (this._region) return this._region
    return defaultRegion
  }

  get rateLimit() {
    this._rateLimit = config.get('rate-limit')
    if (this._rateLimit) return this._rateLimit
    return defaultRateLimit
  }

  get cmaHost() {
    let cma = this.region.cma
    if (cma.startsWith('http')) {
      const u = url.parse(cma)
      if (u.host) return u.host
    }
    return cma
  }

  get cdaHost() {
    let cda = this.region.cda
    if (cda.startsWith('http')) {
      const u = url.parse(cda)
      if (u.host) return u.host
    }
    return cda
  }

  get cdaAPIUrl() {
    let cda = this.region.cda
    return cda.startsWith('http') ? cda : `https://${cda}`
  }

  get cmaAPIUrl() {
    let cma = this.region.cma
    return cma.startsWith('http') ? cma : `https://${cma}`
  }

  get authToken() {
    if (this._authToken) return this._authToken
    this._authToken = config.get('authtoken')
    if (this._authToken)  return this._authToken
    throw new NotLoggedIn()
  }

  getToken(alias) {
    if (alias) {
      const token = config.get(`tokens.${alias}`)
      if (token)  return token
    }
    throw new TokenNotFound(alias)
  }
}

module.exports = {
  Command: ContentstackCommand,
  flags,
}
