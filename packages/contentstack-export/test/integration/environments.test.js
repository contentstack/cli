const fs = require('fs')
const path = require("path")
const uniqBy = require('lodash/uniqBy')
const { expect, test } = require("@oclif/test")
const { cliux: cliUX, messageHandler } = require("@contentstack/cli-utilities")

const { modules } = require('../../src/config/default')
const { getStacksFromEnv, getEnvironmentsCount } = require('./utils/helper')
const { PRINT_LOGS, EXPORT_PATH, DEFAULT_TIMEOUT } = require("./config.json")
const { APP_ENV, DELIMITER, KEY_VAL_DELIMITER } = process.env

async function exec() {
  let stacksFromEnv = getStacksFromEnv()
  for (let stack of stacksFromEnv) {
    let stackDetails = {}
    stackDetails[stack] = stack
    stackDetails['isBranch'] = (stack.split('_', 3).pop() === 'NON') ? false : true;
    process.env[stack].split(DELIMITER).forEach(element => {
      let [key, value] = element.split(KEY_VAL_DELIMITER)
      stackDetails[key] = value;
    })

    const exportBasePath = (stackDetails.isBranch) ? path.join(
      __dirname,
      "..",
      "..",
      `${EXPORT_PATH}_${stack}`,
      stackDetails.branch || "main",
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

    // describe(`ContentStack-Export plugin test [--module=environments] for ${(stack.split('_', 3).pop() === 'NON') ? "non branch stack" : "branch stack"}`, () => {
    describe(`ContentStack-Export plugin test [--module=environments] for`, () => {
      describe("Export environments using cm:stacks:export command without any flags", () => {
        test
          .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
          .stub(cliUX, "prompt", async (name) => {
            switch (name) {
              case promptMessageList.promptSourceStack:
                return stackDetails.STACK_API_KEY
              case promptMessageList.promptPathStoredData:
                return `${EXPORT_PATH}_${stack}`
            }
          })
          .stdout({ print: PRINT_LOGS || false })
          .command(["cm:stacks:export", "--module", "environments"])
          .it("Check environments count", async () => {
            let exportedEnvironmentsCount = 0
            // change to environment
            const environmentsCount = await getEnvironmentsCount(stackDetails)

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

      describe("Export environments using cm:stacks:export command with --stack-api-key=\"Stack API Key\" and --data-dir=\"export path\"", () => {
        test
          .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
          .stdout({ print: PRINT_LOGS || false })
          .command(["cm:stacks:export", "--stack-api-key", stackDetails.STACK_API_KEY, "--data-dir", `${EXPORT_PATH}_${stack}`, "--module", "environments"])
          .it("Check environments count", async () => {
            let exportedEnvironmentsCount = 0
            const environmentsCount = await getEnvironmentsCount();

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

      describe("Export environments using cm:stacks:export command with --stack-api-key=\"Stack API Key\", --data-dir=\"export path\" and management token", () => {
        test
          .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
          .stdout({ print: PRINT_LOGS || false })
          .command(["cm:stacks:export", "--stack-api-key", stackDetails.STACK_API_KEY, "--data-dir", `${EXPORT_PATH}_${stack}`, "--alias", stackDetails.ALIAS_NAME, "--module", "environments"])
          .it("Check environments count", async () => {
            let exportedEnvironmentsCount = 0
            const environmentsCount = await getEnvironmentsCount();

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
    })
  }
}

exec();
