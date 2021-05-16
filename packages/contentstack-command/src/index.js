const {Command, flags} = require('@oclif/command')
const ContentstackManagementSDK = require('@contentstack/management')
const ContentstackDeliverySDK = require('contentstack')
const {TokenNotFound, NotLoggedIn} = require('./custom-errors')
const Configstore = require('configstore')
const config = new Configstore('contentstack_cli')
const url = require('url')
const defaultRegion = {cma: 'https://api.contentstack.io', cda: 'https://cdn.contentstack.io', name: 'NA'}
const defaultRateLimit = 5

/**
 * ContentstackCommand is a class that contains methods for accessing and setting global properties for contentstack cli
 * @class
 * @constructor
 * @public
 */

class ContentstackCommand extends Command {

  /**
   * Get Method for managementAPIClient: returns an instance of managementAPIClient
   * @returns {Object} Object
   */
  
  get managementAPIClient() {
    if (this._managementAPIClient) return this._managementAPIClient
    this._managementAPIClient = ContentstackManagementSDK.client({host:this.cmaHost})
    return this._managementAPIClient
  }

  /**
   * Set Method for managementAPIClient: custom hosts for managementAPIClient
   * @returns {Object} Object 
   *
   */
  
  set managementAPIClient(params) {
    if(params && params.host) {
      //can not set host explicitly as CLI runs under constant host coming from config
      params.host = this.cmaHost
    } else {
      params.host = this.cmaHost
    }
    this._managementAPIClient = ContentstackManagementSDK.client(params)
  }
  
  /**
   *
   * Get Method for email: Get currently configured email in contentstack cli
   *
   */
  
  get email() {
    if (this._email) return this._email
    this._email = config.get('email')
    if(this._email) return this._email
    throw new NotLoggedIn()
  }

  /**
   *
   * Get Method for deliveryAPIClient: Get deliveryAPIClient
   * i.e a client for contentstack delivery sdk
   */
  
  get deliveryAPIClient() {
    if (this._deliveryAPIClient) return this._deliveryAPIClient
    this._deliveryAPIClient = ContentstackDeliverySDK
    return this._deliveryAPIClient
  }

  /**
   *
   * Get currently configured region
   *
   */
  
  get region() {
    if (this._region) return this._region
    this._region = config.get('region')
    if (this._region) return this._region
    // return defaultRegion
  }

  /**
   *
   * Get current rate-limit setting from global config
   *
   */
  
  get rateLimit() {
    this._rateLimit = config.get('rate-limit')
    if (this._rateLimit) return this._rateLimit
    return defaultRateLimit
  }

  /**
   *
   * Get currently configured management api host
   *
   */
  
  get cmaHost() {
    let cma = this.region.cma
    if (cma.startsWith('http')) {
      const u = url.parse(cma)
      if (u.host) return u.host
    }
    return cma
  }

  /**
   *
   * Get currently configured delivery api host
   *
   */
  
  get cdaHost() {
    let cda = this.region.cda
    if (cda.startsWith('http')) {
      const u = url.parse(cda)
      if (u.host) return u.host
    }
    return cda
  }

  /**
   *
   * Get the API url for currently configured delivery host
   *
   */
  
  get cdaAPIUrl() {
    let cda = this.region.cda
    return cda.startsWith('http') ? cda : `https://${cda}`
  }

  /**
   *
   * Get the API url for currently configured management host
   *
   */
  
  get cmaAPIUrl() {
    let cma = this.region.cma
    return cma.startsWith('http') ? cma : `https://${cma}`
  }

  /**
   *
   * Get the currently configured authtoken from global config
   *
   */
  
  get authToken() {
    if (this._authToken) return this._authToken
    this._authToken = config.get('authtoken')
    if (this._authToken)  return this._authToken
    throw new NotLoggedIn()
  }

  /**
   *
   * Get the specified token from global config
   *
   */
  
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
  flags
}
