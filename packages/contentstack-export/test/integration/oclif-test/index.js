const Config = require("@oclif/config")
const { fancy, expect, FancyTypes } = require("fancy-test")

const exit = require("./exit")
const hook = require("./hook")
const { command } = require("./command")
const { loadConfig } = require("./load-config")

loadConfig.root = module.parent.filename
const test = fancy
  .register('loadConfig', loadConfig)
  .register('command', command)
  .register('exit', exit.default)
  .register('hook', hook.default)

module.exports = {
  test,
  expect,
  Config,
  command,
  FancyTypes,
}

exports.default = exports.test
