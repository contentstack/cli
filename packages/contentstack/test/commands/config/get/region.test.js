const {expect, test} = require('@oclif/test')
const Configstore  = require('configstore')
const config = new Configstore('contentstack_cli')

describe('Get config command config:get:region', () => {
  const regions = {
    NA: {cma: 'https://api.contentstack.io', cda: 'https://cdn.contentstack.io', name: 'NA'},
    EU: {cma: 'https://eu-api.contentstack.com', cda: 'https://eu-cdn.contentstack.com', name: 'EU'},
  }

  // eslint-disable-next-line no-undef
  before(() => {
    config.set('region', regions.NA)
  })

  test
  .stdout()
  .command(['config:get:region'])
  .it('Show current region', ctx => {
    expect(ctx.stdout).to.contain(`Currently using ${regions.NA.name} region
CDA HOST: ${regions.NA.cda}
CMA HOST: ${regions.NA.cma}
`)
  })
})
