const {Command, flags} = require('@contentstack/cli-command')
const {isEmpty} = require('lodash')
const chalk = require('chalk')
let {getStack, getConfig, getToken, updateSingleContentTypeEntries, updateContentTypeForGlobalField} = require('../../../lib/util')

class JsonMigrationCommand extends Command {
  async run() {
    const migrateRTEFlag = this.parse(JsonMigrationCommand).flags
    try {
      let config = await getConfig(migrateRTEFlag)
      if (isEmpty(config.paths)) {
        throw new Error('No value provided for the "paths" property in config.')
      }
      const {alias, content_type, isGlobalField} = config
      const token = getToken(alias)
      let stack = getStack({token: token, host: this.cmaHost})
      config.entriesCount = 0
      config.contentTypeCount = 0
      config.errorEntriesUid = []
      if (isGlobalField) {
        await updateContentTypeForGlobalField(stack, content_type, config)
      } else {
        await updateSingleContentTypeEntries(stack, content_type, config)
      }
      console.log(chalk.green(`Updated ${config.contentTypeCount} Content Type(s) and ${config.entriesCount} Entrie(s)`))
      if (config.errorEntriesUid.length > 0) {
        console.log(chalk.red(`Faced issue while migrating some entrie(s),"${config.errorEntriesUid.join(', ')}"`))
      }
    } catch (error) {
      this.error(error.message, {exit: 2})
    }
  }
}

JsonMigrationCommand.description = 'Migration script for migrating HTML RTE to JSON RTE'

JsonMigrationCommand.flags = {
  configPath: flags.string({char: 'p', description: 'Path to config file to be used'}),
  alias: flags.string({char: 'a', description: 'Alias for the management token to be used'}),
  content_type: flags.string({char: 'c', description: 'The content-type from which entries need to be migrated'}),
  isGlobalField: flags.boolean({char: 'g', description: 'This flag is set to false by default. It indicates that current content-type is global-field', default: false}),
  yes: flags.boolean({char: 'y', description: 'Agree to process the command with the current configuration', default: false}),
  htmlPath: flags.string({char: 'h', description: 'Provide path of Html RTE to migrate', dependsOn: ['jsonPath']}),
  jsonPath: flags.string({char: 'j', description: 'Provide path of JSON RTE to migrate', dependsOn: ['htmlPath']}),
  delay: flags.integer({char: 'd', description: 'Provide delay in ms between two entry update', default: 1000}),
  locale: flags.string({char: 'l', description: 'The locale from which entries need to be migrated'}),
}

JsonMigrationCommand.examples = [
  'General Usage',
  'csdx cm:migrate-rte -p path/to/config.json',
  '',
  'Using Flags',
  'csdx cm:migrate-rte -a alias -c content_type_uid -h htmlPath -j jsonPath',
  '',
  'Nested RTE',
  'csdx cm:migrate-rte -a alias -c content_type_uid -h modular_block_uid.block_uid.html_rte_uid -j modular_block_uid.block_uid.json_rte_uid',
  '',
  'csdx cm:migrate-rte -a alias -c content_type_uid -h group_uid.html_rte_uid -j group_uid.json_rte_uid',
  '',
  'Global Field',
  'csdx cm:migrate-rte -a alias -c global_field_uid -g -h htmlPath -j jsonPath',

]

module.exports = JsonMigrationCommand
