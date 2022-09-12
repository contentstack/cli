const fs = require('fs')
const path = require("path")
const { expect, test } = require("@oclif/test")
const { cliux: cliUX, messageHandler } = require("@contentstack/cli-utilities")

const { modules } = require('../../src/config/default')
const { getStacksFromEnv, getCustomRolesCount } = require('./utils/helper')
const { PRINT_LOGS, EXPORT_PATH, DEFAULT_TIMEOUT } = require("./config.json")
const { DELIMITER, KEY_VAL_DELIMITER } = process.env

async function exec() {
  let stacksFromEnv = getStacksFromEnv()

  for (let stack of stacksFromEnv) {
    let stackDetails = {}
    stackDetails['region'] = stack.split('_', 2).pop()
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

    describe("ContentStack-Export plugin test [--module=custom-roles]", () => {
      describe("Export customRoles using cm:stacks:export command without any flags", () => {
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
          .command(["cm:stacks:export", "--module", "custom-roles"])
          .it("Check customRoles count", async () => {
            let exportedCustomRolesCount = 0
            const customRolesCount = await getCustomRolesCount(stackDetails)

            try {
              if (fs.existsSync(customRolesJson)) {
                exportedCustomRolesCount = Object.keys(JSON.parse(fs.readFileSync(customRolesJson, 'utf-8'))).length
              }
            } catch (error) {
              console.trace(error)
            }

            expect(customRolesCount).to.be.an('number').eq(exportedCustomRolesCount)
          })
      })

      describe("Export customRoles using cm:stacks:export command with --stack-api-key=\"Stack API Key\" and --data-dir=\"export path\" and management token", () => {
        test
          .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
          .stdout({ print: PRINT_LOGS || false })
          .command(["cm:stacks:export", "--stack-api-key", stackDetails.STACK_API_KEY, "--data-dir", `${EXPORT_PATH}_${stack}`, "--alias", stackDetails.ALIAS_NAME, "--module", "custom-roles"])
          .it("Check customRoles counts", async () => {
            let exportedCustomRolesCount = 0
            const customRolesCount = await getCustomRolesCount(stackDetails);

            try {
              if (fs.existsSync(customRolesJson)) {
                exportedCustomRolesCount = Object.keys(JSON.parse(fs.readFileSync(customRolesJson, 'utf-8'))).length
              }
            } catch (error) {
              console.trace(error)
            }

            expect(customRolesCount).to.be.an('number').eq(exportedCustomRolesCount)
          })
      })
    })
  }
}

exec();

