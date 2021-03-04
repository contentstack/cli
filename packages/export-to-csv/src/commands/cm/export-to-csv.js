const {Command, flags} = require('@contentstack/cli-command')
const util = require('../../util/index')
const ContentstackManagementSDK = require('@contentstack/management')

class ExportToCsvCommand extends Command {

	get managementAPIClient() {
		// this._managementAPIClient = ContentstackManagementSDK.client({host:this.cmaHost, authtoken: this.authToken})
    this._managementAPIClient = ContentstackManagementSDK.client({host:this.cmaHost, authtoken: this.authToken})
    return this._managementAPIClient
	}

  async run() {
    // const {flags} = this.parse(ExportToCsvCommand)
    // const name = flags.name || 'world'
    // this.log(`hello ${name} from ./src/commands/hello.js`)
    
    const action = await util.startupQuestions()
    // const action = 'Export Entries to CSV'
    // const action = 'Export Organization Users to CSV'
    
    switch(action) {
      case 'Export Entries to CSV': {
        const organization = await util.chooseOrganization(this.managementAPIClient) // prompt for organization
				const stack = await util.chooseStack(this.managementAPIClient, organization.uid) // prompt for stack
				const contentType = await util.chooseContentType(this.managementAPIClient, stack.apiKey) // prompt for content Type
				const language = await util.chooseLanguage(this.managementAPIClient, stack.apiKey) // prompt for language
				const entries = await util.getEntries(this.managementAPIClient, stack.apiKey, contentType.uid, language.code) // fetch entries
				const environments = await util.getEnvironments(this.managementAPIClient, stack.apiKey) // fetch environments, because in publish details only env uid are available and we need env names
				const flatEntries = util.cleanEntries(entries.items, language.code, environments, contentType.uid); // clean entries to be wderitten to file
				const dateTime = util.getDateTime()
				const fileName = `${contentType.uid}_${language.code}_entries_export_${dateTime}.csv`
				util.write(this, flatEntries, fileName) // write to file

        // const tokenDetails = this.getToken(alias)

				// const stack = this.managementAPIClient.stack({api_key: tokenDetails.apiKey, management_token: tokenDetails.token})
				// this.log('Fetching Entries')

				// stack.contentType(contentType).entry().query({include_publish_details: true}).find()
				// .then(async entries => {
				// 	const environments = await this.getEnvironments(stack)
				// 	const flatEntries = this.cleanEntries(entries.items, locale, environments, stack);
				// 	this.write(flatEntries)
				// })
        break;
      }
      case 'Export Organization Users to CSV': {
        try {
          const organization = await util.chooseOrganization(this.managementAPIClient, action) // prompt for organization
          const orgUsers = await util.getOrgUsers(this.managementAPIClient, organization.uid)
          const orgRoles = await util.getOrgRoles(this.managementAPIClient, organization.uid)
          const mappedUsers = util.getMappedUsers(orgUsers)
          const mappedRoles = util.getMappedRoles(orgRoles)
          const listOfUsers = util.cleanOrgUsers(orgUsers, mappedUsers, mappedRoles)
          const dateTime = util.getDateTime()
          const fileName = `${organization.name}_users_export_${dateTime}.csv`
          util.write(this, listOfUsers, fileName)
        } catch(error) {
          this.error(error)
        }
        break;
      }
    }
  }
}

ExportToCsvCommand.description = `Describe the command here
...
Extra documentation goes here
`

ExportToCsvCommand.flags = {
  file: flags.string({char: 'l', description: 'Language', default: 'en-us'}),
  contentType: flags.string({char: 'c', description: 'Content Type'}),
}

module.exports = ExportToCsvCommand
