const fs = require('fs')
const path = require("path")
const uniqBy = require('lodash/uniqBy')
const { expect, test } = require("@oclif/test")
const { cliux: cliUX, messageHandler } = require("@contentstack/cli-utilities")

const { modules } = require('../../src/config/default')
const { getEnvData, getAssetAndFolderCount } = require('./utils/helper')
const { PRINT_LOGS, EXPORT_PATH, DEFAULT_TIMEOUT } = require("./config.json")

const exportBasePath = path.join(
  __dirname,
  "..",
  "..",
  EXPORT_PATH
)
const assetsBasePath = path.join(
  exportBasePath,
  modules.assets.dirName
)
const assetsFolderPath = path.join(
  assetsBasePath,
  'folders.json'
)
const assetsJson = path.join(
  assetsBasePath,
  modules.assets.fileName
)
const messageFilePath = path.join(
  __dirname,
  "..",
  "..",
  "messages/index.json"
)

const { NA: { BRANCH: { STACK_API_KEY } } } = getEnvData()

messageHandler.init({ messageFilePath })
const { promptMessageList } = require(messageFilePath)

describe("ContentStack-Export plugin test [--module=assets]", () => {
  describe("Export assets using cm:stacks:export command without any flags", () => {
    test
      .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
      .stub(cliUX, "prompt", async (name) => {
        switch (name) {
          case promptMessageList.promptSourceStack:
            return STACK_API_KEY
          case promptMessageList.promptPathStoredData:
            return EXPORT_PATH
        }
      })
      .stdout({ print: PRINT_LOGS || false })
      .command(["cm:stacks:export", "--module", "assets"])
      .it("Check folder count done", async () => {
        let exportedAssetsCount = 0
        let exportedAssetsFolderCount = 0
        const { assetCount, folderCount } = await getAssetAndFolderCount()

        try {
          if (fs.existsSync(assetsFolderPath)) {
            exportedAssetsFolderCount = uniqBy(JSON.parse(fs.readFileSync(assetsFolderPath, 'utf-8')), 'uid').length
          }
          if (fs.existsSync(assetsJson)) {
            exportedAssetsCount = Object.keys(JSON.parse(fs.readFileSync(assetsJson, 'utf-8'))).length
          }
        } catch (error) {
          console.trace(error)
        }

        expect(assetCount).to.be.an('number').eq(exportedAssetsCount)
        expect(folderCount).to.be.an('number').eq(exportedAssetsFolderCount)
      })
  })

  describe("Export assets using cm:stacks:export command with --stack-api-key=\"Stack API Key\" and --data-dir=\"export path\"", () => {
    test
      .timeout(DEFAULT_TIMEOUT || 600000) // NOTE setting default timeout as 10 minutes
      .stdout({ print: PRINT_LOGS || false })
      .command(["cm:stacks:export", "--stack-api-key", STACK_API_KEY, "--data-dir", EXPORT_PATH, "--module", "assets"])
      .it("Check folder counts done", async () => {
        let exportedAssetsCount = 0
        let exportedAssetsFolderCount = 0
        const { assetCount, folderCount } = await getAssetAndFolderCount();

        try {
          if (fs.existsSync(assetsFolderPath)) {
            exportedAssetsFolderCount = uniqBy(JSON.parse(fs.readFileSync(assetsFolderPath, 'utf-8')), 'uid').length
          }
          if (fs.existsSync(assetsJson)) {
            exportedAssetsCount = Object.keys(JSON.parse(fs.readFileSync(assetsJson, 'utf-8'))).length
          }
        } catch (error) {
          console.trace(error)
        }

        expect(assetCount).to.be.an('number').eq(exportedAssetsCount)
        expect(folderCount).to.be.an('number').eq(exportedAssetsFolderCount)
      })
  })
})
