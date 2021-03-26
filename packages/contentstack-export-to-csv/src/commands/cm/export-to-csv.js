const {Command} = require('@contentstack/cli-command')
const util = require('../../util/index')
const ContentstackManagementSDK = require('@contentstack/management')
const config = require('../../util/config.js')

class ExportToCsvCommand extends Command {

	get managementAPIClient() {
		// this._managementAPIClient = ContentstackManagementSDK.client({host:this.cmaHost, authtoken: this.authToken})
    this._managementAPIClient = ContentstackManagementSDK.client({host:this.cmaHost, authtoken: this.authToken})
    return this._managementAPIClient
	}

  async run() {
    
    const action = await util.startupQuestions()
    
    switch(action) {
      case config.exportEntries: {
        const organization = await util.chooseOrganization(this.managementAPIClient) // prompt for organization
				const stack = await util.chooseStack(this.managementAPIClient, organization.uid) // prompt for stack
				const contentTypes = await util.chooseContentType(this.managementAPIClient, stack.apiKey) // prompt for content Type
				const language = await util.chooseLanguage(this.managementAPIClient, stack.apiKey) // prompt for language
				const environments = await util.getEnvironments(this.managementAPIClient, stack.apiKey) // fetch environments, because in publish details only env uid are available and we need env names
        while(contentTypes.length > 0) {
          let contentType = contentTypes.shift()
          let entries = await util.getEntries(this.managementAPIClient, stack.apiKey, contentType, language.code) // fetch entries
          let flatEntries = util.cleanEntries(entries.items, language.code, environments, contentType); // clean entries to be wderitten to file
          // let dateTime = util.getDateTime()
          // let fileName = `${contentType}_${language.code}_entries_export_${dateTime}.csv`
          let fileName = `${stack.name}_${contentType}_${language.code}_entries_export.csv`

          util.write(this, flatEntries, fileName) // write to file
        }
        break;
      }
      case config.exportUsers: {
        try {
          const organization = await util.chooseOrganization(this.managementAPIClient, action) // prompt for organization
          const orgUsers = await util.getOrgUsers(this.managementAPIClient, organization.uid, this)
          const orgRoles = await util.getOrgRoles(this.managementAPIClient, organization.uid, this)
          const mappedUsers = util.getMappedUsers(orgUsers)
          const mappedRoles = util.getMappedRoles(orgRoles)
          const listOfUsers = util.cleanOrgUsers(orgUsers, mappedUsers, mappedRoles)
          // const dateTime = util.getDateTime()
          // const fileName = `${util.kebabize(organization.name.replace(config.organizationNameRegex, ''))}_users_export_${dateTime}.csv`
          const fileName = `${util.kebabize(organization.name.replace(config.organizationNameRegex, ''))}_users_export.csv`

          util.write(this, listOfUsers, fileName)
        } catch(error) {
          this.error(error)
        }
        break;
      }
    }
  }
}

ExportToCsvCommand.description = `Export entries or organization users to csv using this command
`

module.exports = ExportToCsvCommand
