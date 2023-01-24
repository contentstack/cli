let defaultConfig = require('../../src/config/default');
const fs = require('fs')
const path = require("path")
const { expect, test } = require("@oclif/test")
const { cliux: cliUX, messageHandler } = require("@contentstack/cli-utilities")

const { modules } = require('../../src/config/default')
const { getStackDetailsByRegion, getExtensionsCount, cleanUp } = require('./utils/helper')
const { PRINT_LOGS, EXPORT_PATH, DEFAULT_TIMEOUT } = require("./config.json")
const { DELIMITER, KEY_VAL_DELIMITER } = process.env

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
    const extensionsBasePath = path.join(
      exportBasePath,
      modules.extensions.dirName
    )
    const extensionsJson = path.join(
      extensionsBasePath,
      modules.extensions.fileName
    )
    const messageFilePath = path.join(
      __dirname,
      "..",
      "..",
      "messages/index.json"
    )

    messageHandler.init({ messageFilePath })
    const { promptMessageList } = require(messageFilePath)

    describe("ContentStack-Export plugin test [--module=extensions]", () => {
      describe("Export extensions using cm:stacks:export command without any flags", () => {
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
          .command(["cm:stacks:export", "--module", "extensions"])
          .it("Check extensions count", async () => {
            let exportedExtensionsCount = 0
            const extensionsCount = await getExtensionsCount(stackDetails[stack])

            try {
              if (fs.existsSync(extensionsJson)) {
                exportedExtensionsCount = Object.keys(JSON.parse(fs.readFileSync(extensionsJson, 'utf-8'))).length
              }
            } catch (error) {
              console.trace(error)
            }

            expect(extensionsCount).to.be.an('number').eq(exportedExtensionsCount)
          })
      })

      describe("Export extensions using cm:stacks:export command with --stack-api-key=\"Stack API Key\" and --data-dir=\"export path\" and management token", () => {
        test
          .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
          .stdout({ print: PRINT_LOGS || false })
          .command(["cm:stacks:export", "--stack-api-key", stackDetails[stack].STACK_API_KEY, "--data-dir", `${EXPORT_PATH}_${stack}`, "--alias", stackDetails[stack].ALIAS_NAME, "--module", "extensions"])
          .it("Check Extensions counts", async () => {
            let exportedExtensionsCount = 0
            const extensionsCount = await getExtensionsCount(stackDetails[stack]);

            try {
              if (fs.existsSync(extensionsJson)) {
                exportedExtensionsCount = Object.keys(JSON.parse(fs.readFileSync(extensionsJson, 'utf-8'))).length
              }
            } catch (error) {
              console.trace(error)
            }

            expect(extensionsCount).to.be.an('number').eq(exportedExtensionsCount)
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

