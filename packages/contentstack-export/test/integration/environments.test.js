let defaultConfig = require('../../src/config/default');
const fs = require('fs')
const path = require("path")
const uniqBy = require('lodash/uniqBy')
const { expect, test } = require("@oclif/test")
const { cliux: cliUX, messageHandler } = require("@contentstack/cli-utilities")

const { modules } = require('../../src/config/default')
const { getStackDetailsByRegion, getEnvironmentsCount, cleanUp } = require('./utils/helper')
const { PRINT_LOGS, EXPORT_PATH, DEFAULT_TIMEOUT } = require("./config.json")
const { APP_ENV, DELIMITER, KEY_VAL_DELIMITER } = process.env

module.exports = (region) => {
  const stackDetails = getStackDetailsByRegion(region, DELIMITER, KEY_VAL_DELIMITER)
  for (let stack of Object.keys(stackDetails)) {
    const exportBasePath = (stackDetails[stack].BRANCH) ? path.join(
      __dirname,
      "..",
      "..",
      `${EXPORT_PATH}_${stack}`,
      stackDetails[stack].BRANCH
    ) : path.join(
      __dirname,
      "..",
      "..",
      `${EXPORT_PATH}_${stack}`
    )
    const environmentsBasePath = path.join(
      exportBasePath,
      modules.environments.dirName
    )
    const environmentsJson = path.join(
      environmentsBasePath,
      modules.environments.fileName
    )
    const messageFilePath = path.join(
      __dirname,
      "..",
      "..",
      "messages/index.json"
    )

    messageHandler.init({ messageFilePath })
    const { promptMessageList } = require(messageFilePath)

    describe(`ContentStack-Export plugin test [--module=environments] for ${stackDetails[stack].STACK_API_KEY} ${stackDetails[stack].MANAGEMENT_TOKEN}`, () => {
      describe(`${stackDetails[stack].STACK_API_KEY} ${stackDetails[stack].MANAGEMENT_TOKEN} Export environments using cm:stacks:export command without any flags`, () => {
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
          .command(["cm:stacks:export", "--module", "environments"])
          .it("Check environments count", async () => {
            let exportedEnvironmentsCount = 0
            // change to environment
            const environmentsCount = await getEnvironmentsCount(stackDetails[stack])

            try {
              if (fs.existsSync(environmentsJson)) {
                exportedEnvironmentsCount = Object.keys(JSON.parse(fs.readFileSync(environmentsJson, 'utf-8'))).length
              }
            } catch (error) {
              console.trace(error)
            }

            expect(environmentsCount).to.be.an('number').eq(exportedEnvironmentsCount)
          })
      })

      describe(`${stackDetails[stack].STACK_API_KEY} Export environments using cm:stacks:export command with --stack-api-key=\"Stack API Key\" and --data-dir=\"export path\"`, () => {
        test
          .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
          .stdout({ print: PRINT_LOGS || false })
          .command(["cm:stacks:export", "--stack-api-key", stackDetails[stack].STACK_API_KEY, "--data-dir", `${EXPORT_PATH}_${stack}`, "--module", "environments"])
          .it("Check environments count", async () => {
            let exportedEnvironmentsCount = 0
            const environmentsCount = await getEnvironmentsCount(stackDetails[stack]);

            try {
              if (fs.existsSync(environmentsJson)) {
                exportedEnvironmentsCount = Object.keys(JSON.parse(fs.readFileSync(environmentsJson, 'utf-8'))).length
              }
            } catch (error) {
              console.trace(error)
            }

            expect(environmentsCount).to.be.an('number').eq(exportedEnvironmentsCount)
            await cleanUp(environmentsBasePath);
          })
      })

      describe(`${stackDetails[stack].STACK_API_KEY} ${stackDetails[stack].ALIAS_NAME} Export environments using cm:stacks:export command with --stack-api-key=\"Stack API Key\", --data-dir=\"export path\" and management token`, () => {
        test
          .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
          .stdout({ print: PRINT_LOGS || false })
          .command(["cm:stacks:export", "--stack-api-key", stackDetails[stack].STACK_API_KEY, "--data-dir", `${EXPORT_PATH}_${stack}`, "--alias", stackDetails[stack].ALIAS_NAME, "--module", "environments"])
          .it("Check environments count", async () => {
            let exportedEnvironmentsCount = 0
            const environmentsCount = await getEnvironmentsCount(stackDetails[stack]);

            try {
              if (fs.existsSync(environmentsJson)) {
                exportedEnvironmentsCount = Object.keys(JSON.parse(fs.readFileSync(environmentsJson, 'utf-8'))).length
              }
            } catch (error) {
              console.trace(error)
            }

            expect(environmentsCount).to.be.an('number').eq(exportedEnvironmentsCount)
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
    })
  }
}
