const { test } = require("./oclif-test")
const { DEFAULT_TIMEOUT, PRINT_LOGS, REGION_NAME } = require("./config.json")
const RegionGetCommand = require('@contentstack/cli-config/lib/commands/config/set/region').default

describe("Check if all the configurations available to perform the export else set all configuration data.", () => {
  describe('Setting region', async () => {
    test
      .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
      .stdout({ print: PRINT_LOGS || false })
      .command(RegionGetCommand, [`${REGION_NAME || 'NA'}`])
      .it('Setting region is done')
  })
})
