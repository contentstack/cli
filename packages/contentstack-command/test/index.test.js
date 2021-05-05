const {expect} = require('chai')
const {Command: CommandBase} = require('../src')
const {TokenNotFound, NotLoggedIn} = require('../src/custom-errors')
const dummyConfig = {
  uuid: '5572a012-8201-4102-9965-b8846e91ffe2',
  apiVersion: 3,
  region: {
    cma: 'https://api.contentstack.io',
    cda: 'https://cdn.contentstack.io',
    name: 'NA',
  },
  authtoken: 'bltba06f8c683f70',
  email: 'ninad.hatkar@contentstack.com',
  tokens: {
    dummy: {
      token: 'blt456',
      apiKey: 'blt123',
      type: 'management',
    },
    dummyDeliveryToken: {
      token: 'blt890',
      apiKey: 'blt567',
      environment: 'production',
      type: 'delivery',
    },
  },
}

class Command extends CommandBase {
  async run() {
    // eslint-disable-next-line no-console
    console.log('hello world')
  }
}

describe('index', () => {
  it('has Command', async () => {
    expect(typeof Command).to.equal('function')
  })
})

describe('Contentstack Management Client', () => {
  let preserveRegion
  let config
  let cmd
  // eslint-disable-next-line no-undef
  before(function () {
    const Configstore = require('configstore')
    config = new Configstore('contentstack_cli')
    preserveRegion = config.get('region')
    config.set('region', {cma: 'https://eu-api.contentstack.com', cda: 'https://eu-cdn.contentstack.com', name: 'EU'})
    cmd = new Command()
  })
  it('has contentstack client object', async () => {
    const managementClient = cmd.managementAPIClient
    expect(typeof managementClient).to.equal('object')
  })
  it('client should have properties axiosInstance, login, logout, getUser, stack, organization', async () => {
    const managementClient = cmd.managementAPIClient
    expect(managementClient).to.have.property('axiosInstance')
    expect(managementClient).to.have.property('login')
    expect(managementClient).to.have.property('logout')
    expect(managementClient).to.have.property('getUser')
    expect(managementClient).to.have.property('stack')
    expect(managementClient).to.have.property('organization')
  })
  it('should return contentstack sdk client with selected region', async () => {
    let axiosInstance = cmd.managementAPIClient.axiosInstance
    expect(axiosInstance.defaults.host).to.equal('eu-api.contentstack.com')
  })

  it('should set management SDK params', async () => {
    cmd.managementAPIClient = {application: 'cli-plugin'}
    let axiosInstance = cmd.managementAPIClient.axiosInstance
    expect(axiosInstance.defaults.application).to.equal('cli-plugin')
    expect(axiosInstance.defaults.host).to.equal('eu-api.contentstack.com')
  })
  it('black object should at-least set management SDK cma with region in configstore', async () => {
    cmd.managementAPIClient = {}
    let axiosInstance = cmd.managementAPIClient.axiosInstance
    expect(axiosInstance.defaults.host).to.equal('eu-api.contentstack.com')
  })
  it('should not be able to set host for management SDK via params', async () => {
    cmd.managementAPIClient = {application: 'cli-plugin', host: 'https://test.contentstack.com'}
    let axiosInstance = cmd.managementAPIClient.axiosInstance
    expect(axiosInstance.defaults.host).to.equal('eu-api.contentstack.com')
  })
  // eslint-disable-next-line no-undef
  after(function () {
    if (preserveRegion)
      config.set('region', preserveRegion)
    else
      config.set('region', {cma: 'https://api.contentstack.io', cda: 'https://cdn.contentstack.io', name: 'NA'})
  })
})

describe('Contentstack Delivery Client', () => {
  let cmd
  // eslint-disable-next-line no-undef
  before(function () {
    cmd = new Command()
  })
  it('has contentstack client object', async () => {
    const deliveryClient = cmd.deliveryAPIClient
    expect(typeof deliveryClient).to.equal('object')
  })
  it('has contentstack client object return from memory', async () => {
    const deliveryClient = cmd.deliveryAPIClient
    expect(typeof deliveryClient).to.equal('object')
  })
})

describe('Check properties', () => {
  let preserveConfig
  let config
  let cmd
  // eslint-disable-next-line no-undef
  before(function () {
    const Configstore = require('configstore')
    config = new Configstore('contentstack_cli')
    preserveConfig = config.all
    config.all = dummyConfig
    cmd = new Command()
  })
  it('has authtoken property and fetch the value from configstore', async () => {
    const authtoken = cmd.authToken
    expect(typeof authtoken).to.equal('string')
    expect(authtoken).to.equal(dummyConfig.authtoken)
  })
  it('has cmaHost property and fetch the value from configstore', async () => {
    const cmaHost = cmd.cmaHost
    expect(typeof cmaHost).to.equal('string')
    let cmaURL = dummyConfig.region.cma
    let host = cmaURL.slice('https://'.length, cmaURL.length)
    expect(cmaHost).to.equal(host)
  })
  it('has cdaHost property and fetch the value from configstore', async () => {
    const cdaHost = cmd.cdaHost
    expect(typeof cdaHost).to.equal('string')
    let cdaURL = dummyConfig.region.cda
    let host = cdaURL.slice('https://'.length, cdaURL.length)
    expect(cdaHost).to.equal(host)
  })
  it('has cdaAPIUrl property and fetch the value from configstore', async () => {
    const cdaAPIUrl = cmd.cdaAPIUrl
    expect(typeof cdaAPIUrl).to.equal('string')
    let cdaURL = dummyConfig.region.cda
    expect(cdaURL).to.equal(cdaAPIUrl)
  })
  it('has cmaAPIUrl property and fetch the value from configstore', async () => {
    const cmaAPIUrl = cmd.cmaAPIUrl
    expect(typeof cmaAPIUrl).to.equal('string')
    let cmaURL = dummyConfig.region.cma
    expect(cmaAPIUrl).to.equal(cmaURL)
  })
  it('has email property and fetch the value from configstore', async () => {
    const email = cmd.email
    expect(typeof email).to.equal('string')
    let dummyEmail = dummyConfig.email
    expect(email).to.equal(dummyEmail)
  })
  it('has email property and fetch from in memory', async () => {
    const email = cmd.email
    expect(typeof email).to.equal('string')
    let dummyEmail = dummyConfig.email
    expect(email).to.equal(dummyEmail)
  })
  it('has authtoken property and return value from memory', async () => {
    const authtoken = cmd.authToken
    expect(typeof authtoken).to.equal('string')
    expect(authtoken).to.equal(dummyConfig.authtoken)
  })
  // eslint-disable-next-line no-undef
  after(function () {
    config.all = preserveConfig
  })
})

describe('Check properties cma and cda url and host when protocol not present in configstore', () => {
  let preserveConfig
  let config
  let cmd
  // eslint-disable-next-line no-undef
  before(function () {
    const Configstore = require('configstore')
    config = new Configstore('contentstack_cli')
    preserveConfig = config.all
    config.all = dummyConfig
    config.set('region.cma', 'testcma.contentstack.com')
    config.set('region.cda', 'testcda.contentstack.com')
    cmd = new Command()
  })
  it('should add protocol https in url when accessed property cdaAPIUrl', async () => {
    expect(cmd.cdaAPIUrl).to.equal('https://testcda.contentstack.com')
  })
  it('should add protocol https in url when accessed property cmaAPIUrl', async () => {
    expect(cmd.cmaAPIUrl).to.equal('https://testcma.contentstack.com')
  })
  it('should return host as it is when accessed property cmaHost', async () => {
    expect(cmd.cmaHost).to.equal('testcma.contentstack.com')
  })
  it('should return host as it is when accessed property cdaHost', async () => {
    expect(cmd.cdaHost).to.equal('testcda.contentstack.com')
  })
  // eslint-disable-next-line no-undef
  after(function () {
    config.all = preserveConfig
  })
})

describe('Check properties email and authtoken when not logged in', () => {
  let preserveConfig
  let config
  let cmd
  // eslint-disable-next-line no-undef
  before(function () {
    const Configstore = require('configstore')
    config = new Configstore('contentstack_cli')
    preserveConfig = config.all
    config.all = dummyConfig
    config.delete('email')
    config.delete('authtoken')
    cmd = new Command()
  })
  it('should throw email not found as not logged in', async () => {
    expect(function () {
      // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
      let email = cmd.email
    }).throw(NotLoggedIn)
  })
  it('should authtoken not found as not logged in', async () => {
    expect(function () {
      // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
      let authtoken = cmd.authToken
    }).throw(NotLoggedIn)
  })
  // eslint-disable-next-line no-undef
  after(function () {
    config.all = preserveConfig
  })
})

describe('Check functions', () => {
  let preserveConfig
  let config
  let cmd
  // eslint-disable-next-line no-undef
  before(function () {
    const Configstore = require('configstore')
    config = new Configstore('contentstack_cli')
    preserveConfig = config.all
    config.all = dummyConfig
    cmd = new Command()
  })
  it('should get token by alias', async () => {
    const cmaToken = cmd.getToken('dummy')
    const cdaToken = cmd.getToken('dummyDeliveryToken')
    expect(cmaToken).to.deep.equal({
      token: 'blt456',
      apiKey: 'blt123',
      type: 'management',
    })
    expect(cdaToken).to.deep.equal({
      token: 'blt890',
      apiKey: 'blt567',
      environment: 'production',
      type: 'delivery',
    })
  })
  it('should throws error if token not found with alias', async () => {
    expect(function () {
      cmd.getToken('dummy123')
    }).throw(TokenNotFound)
  })
  // eslint-disable-next-line no-undef
  after(function () {
    config.all = preserveConfig
  })
})
