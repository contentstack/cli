let defaultConfig = require('../../src/config/default');
const fs = require('fs')
const path = require("path")
const { test } = require("@oclif/test")
const { cliux: cliUX, messageHandler } = require("@contentstack/cli-utilities")

const { modules } = require('../../src/config/default')
const { getStackDetailsByRegion, getCustomRolesCount, cleanUp, checkCounts } = require('./utils/helper')
const { EXPORT_PATH, DEFAULT_TIMEOUT } = require("./config.json")
const { PRINT_LOGS, DELIMITER, KEY_VAL_DELIMITER } = process.env

module.exports = (region) => {
  const stackDetails = getStackDetailsByRegion(region, DELIMITER, KEY_VAL_DELIMITER)
  for (let stack of Object.keys(stackDetails)) {

    const exportBasePath = (stackDetails[stack].BRANCH) ? path.join(
      __dirname,
      "..",
      "..",
      `${EXPORT_PATH}_${stack}`,
      stackDetails[stack].BRANCH,
    ) : path.join(
      __dirname,
      "..",
      "..",
      `${EXPORT_PATH}_${stack}`
    )
    const customRolesBasePath = path.join(
      exportBasePath,
      modules.customRoles.dirName
    )
    const customRolesJson = path.join(
      customRolesBasePath,
      modules.customRoles.fileName
    )
    const messageFilePath = path.join(
      __dirname,
      "..",
      "..",
      "messages/index.json"
    )

    messageHandler.init({ messageFilePath })
    const { promptMessageList } = require(messageFilePath)

    describe("ContentStack-Export custom-roles", () => {
      describe("cm:stacks:export custom-roles [auth-token]", () => {
        test
          .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
          .stub(cliUX, "prompt", async (name) => {
            switch (name) {
              case promptMessageList.promptSourceStack:
                return stackDetails[stack].STACK_API_KEY
              case promptMessageList.promptPathStoredData:
                return `${EXPORT_PATH}_${stack}`
            }
          })
          .stdout({ print: PRINT_LOGS || false })
          .command(["cm:stacks:export", "--module", "custom-roles"])
          .it("Check custom-roles count", async () => {
            let exportedCustomRolesCount = 0
            const customRolesCount = await getCustomRolesCount(stackDetails[stack])

            try {
              if (fs.existsSync(customRolesJson)) {
                exportedCustomRolesCount = Object.keys(JSON.parse(fs.readFileSync(customRolesJson, 'utf-8'))).length
              }
            } catch (error) {
              console.trace(error)
            }
            checkCounts(customRolesCount, exportedCustomRolesCount)
          })
      })

      describe("cm:stacks:export custom-roles [management-token]", () => {
        test
          .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
          .stdout({ print: PRINT_LOGS || false })
          .command(["cm:stacks:export", "--stack-api-key", stackDetails[stack].STACK_API_KEY, "--data-dir", `${EXPORT_PATH}_${stack}`, "--alias", stackDetails[stack].ALIAS_NAME, "--module", "custom-roles"])
          .it("Check custom-roles counts", async () => {
            let exportedCustomRolesCount = 0
            const customRolesCount = await getCustomRolesCount(stackDetails[stack]);

            try {
              if (fs.existsSync(customRolesJson)) {
                exportedCustomRolesCount = Object.keys(JSON.parse(fs.readFileSync(customRolesJson, 'utf-8'))).length
              }
            } catch (error) {
              console.trace(error)
            }

            checkCounts(customRolesCount, exportedCustomRolesCount)
          })
      })
    })

    afterEach(async () => {
      await cleanUp(path.join(
      __dirname,
      "..",
      "..",
      `${EXPORT_PATH}_${stack}`));
      defaultConfig.management_token = undefined
      defaultConfig.branch = undefined
      defaultConfig.branches = []
    })
  }
}

