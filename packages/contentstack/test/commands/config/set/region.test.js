const {expect, test} = require('@oclif/test')
const {assert} = require('chai')
const Configstore  = require('configstore')
const config = new Configstore('contentstack_cli')

describe('config:set:region EU', () => {
  const regions = {
    NA: {cma: 'https://api.contentstack.io', cda: 'https://cdn.contentstack.io', name: 'NA'},
    EU: {cma: 'https://eu-api.contentstack.com', cda: 'https://eu-cdn.contentstack.com', name: 'EU'},
  }

  // eslint-disable-next-line no-undef
  beforeEach(() => {
    config.set('region', regions.NA)
  })

  test
  .stdout()
  .command(['config:set:region', 'EU'])
  .it('set region to EU', ctx => {
    const region = config.get('region')
    assert.equal(region.name, regions.EU.name)
    assert.equal(region.cda, regions.EU.cda)
    assert.equal(region.cma, regions.EU.cma)
    expect(ctx.stdout).to.contain(`Currently using NA region
Region has been set to ${regions.EU.name}
CDA HOST: ${regions.EU.cda}
CMA HOST: ${regions.EU.cma}
`)
  })

  test
  .stdout()
  .command(['config:set:region', '-n', 'India', '-d', 'https://in-api.contentstack.com', '-m', 'https://in-cda.contentstack.com'])
  .it('set custom region', ctx => {
    const region = config.get('region')
    assert.equal(region.name, 'India')
    assert.equal(region.cda, 'https://in-api.contentstack.com')
    assert.equal(region.cma, 'https://in-cda.contentstack.com')
    expect(ctx.stdout).to.contain(`Currently using NA region
Custom region has been set to India
CDA HOST: https://in-api.contentstack.com
CMA HOST: https://in-cda.contentstack.com
`)
  })

  test
  .stdout()
  .command(['config:set:region', '-n', 'hello', '-d', 'invalid-url', '-m', 'https://in-cda.contentstack.com'])
  .it('should give error message for invalid option values', ctx => {
    const region = config.get('region')
    assert.equal(region.name, regions.NA.name)
    assert.equal(region.cda, regions.NA.cda)
    assert.equal(region.cma, regions.NA.cma)
    expect(ctx.stdout).to.contain(`Currently using NA region
Custom region should include valid cma(URL), cda(URL), name(String) (Name for the Region) property.
`)
  })

  test
  .stdout()
  .command(['config:set:region'])
  .it('should give set to NA when no arguments are provided', ctx => {
    const region = config.get('region')
    assert.equal(region.name, regions.NA.name)
    assert.equal(region.cda, regions.NA.cda)
    assert.equal(region.cma, regions.NA.cma)
    expect(ctx.stdout).to.contain(`Currently using NA region
No argument or custom flag provided. Setting region to default NA
`)
  })
})
