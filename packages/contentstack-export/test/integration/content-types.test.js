const fs = require('fs')
const path = require("path")
const { expect, test } = require("@oclif/test")
const { cliux: cliUX, messageHandler } = require("@contentstack/cli-utilities")

const { modules } = require('../../src/config/default')
const { getStacksFromEnv, getContentTypesCount } = require('./utils/helper')
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
    const content_typesBasePath = path.join(
      exportBasePath,
      modules.content_types.dirName
    )
    const content_typesJson = path.join(
      content_typesBasePath,
      modules.content_types.fileName
    )
    const messageFilePath = path.join(
      __dirname,
      "..",
      "..",
      "messages/index.json"
    )

    messageHandler.init({ messageFilePath })
    const { promptMessageList } = require(messageFilePath)

    describe("ContentStack-Export plugin test [--module=content_types]", () => {
      describe("Export Content types using cm:stacks:export command without any flags", () => {
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
          .command(["cm:stacks:export", "--module", "content_types"])
          .it("Check content_types count", async () => {
            let exportedContentTypesCount = 0
            const contentTypesCount = await getContentTypesCount(stackDetails)

            try {
              if (fs.existsSync(content_typesJson)) {
                exportedContentTypesCount = Object.keys(JSON.parse(fs.readFileSync(content_typesJson, 'utf-8'))).length
              }
            } catch (error) {
              console.trace(error)
            }

            expect(contentTypesCount).to.be.an('number').eq(exportedContentTypesCount)
          })
      })

      describe("Export Content types using cm:stacks:export command with --stack-api-key=\"Stack API Key\" and --data-dir=\"export path\" and management token", () => {
        test
          .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
          .stdout({ print: PRINT_LOGS || false })
          .command(["cm:stacks:export", "--stack-api-key", stackDetails.STACK_API_KEY, "--data-dir", `${EXPORT_PATH}_${stack}`, "--alias", stackDetails.ALIAS_NAME, "--module", "content_types"])
          .it("Check content_types counts", async () => {
            let exportedContentTypesCount = 0
            const contentTypesCount = await getContentTypesCount(stackDetails);

            try {
              if (fs.existsSync(content_typesJson)) {
                exportedContentTypesCount = Object.keys(JSON.parse(fs.readFileSync(content_typesJson, 'utf-8'))).length
              }
            } catch (error) {
              console.trace(error)
            }

            expect(contentTypesCount).to.be.an('number').eq(exportedContentTypesCount)
          })
      })
    })
  }
}

exec();

