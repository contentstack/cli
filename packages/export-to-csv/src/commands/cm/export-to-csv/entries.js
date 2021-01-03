const {Command, flags} = require('@contentstack/cli-command')
const ContentstackManagementSDK = require('@contentstack/management')
const fastcsv = require('fast-csv')
const fs = require('fs')
const inquirer = require('inquirer')
const debug = require('debug')("export-to-csv")
const config = require('../../../util/config.js')

class ExportToCsvCommand extends Command {

	get managementAPIClient() {
		this._managementAPIClient = ContentstackManagementSDK.client({host:this.cmaHost, authtoken: this.authToken})
    return this._managementAPIClient
	}

  async run() {
    const {flags} = this.parse(ExportToCsvCommand)
    // const name = flags.name || 'world'
    const alias = flags.alias
    const locale = flags.locale
    const contentType = flags.contentType
    // this.log(`hello ${name} from ./src/commands/hello.js`)
    
    const action = await this.startupQuestions()
    // const action = 'Export Entries to CSV'
    
    switch(action) {
    	case 'Export Entries to CSV':
    		const organization = await this.chooseOrganization() // prompt for organization
				const stack = await this.chooseStack(organization.uid) // prompt for stack
				const contentType = await this.chooseContentType(stack.apiKey) // prompt for content Type
				const language = await this.chooseLanguage(stack.apiKey) // prompt for language
				const entries = await this.getEntries(stack.apiKey, contentType.uid, language.code) // fetch entries
				const environments = await this.getEnvironments(stack.apiKey) // fetch environments, because in publish details only env uid are available and we need env names
				const flatEntries = this.cleanEntries(entries.items, language.code, environments, contentType.uid); // clean entries to be written to file
				const dateTime = this.getDateTime()
				const fileName = `${contentType.uid}_${language.code}_entries_export_${dateTime}.csv`
				this.write(flatEntries, fileName) // write to file

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
    	case 'Export Organization Users to CSV':
    		break;
    }
  }

  getDateTime() {
  	let date = new Date()
  	let dateTime = date.toLocaleString().split(',')
  	dateTime[0] = dateTime[0].split('/').join('-')
  	dateTime[1] = dateTime[1].trim() // trim the space before time
  	dateTime[1] = dateTime[1].split(' ').join('')
  	return dateTime.join('_')
  }

  getEntries(stackApiKey, contentType, language) {
  	return new Promise(resolve => {
  		this.managementAPIClient
  		.stack({api_key: stackApiKey})
  		.contentType(contentType)
  		.entry()
  		.query({include_publish_details: true, locale: language})
  		.find()
  		.then(entries => resolve(entries))
  	})
  }

  cleanEntries(entries, language, environments, contentTypeUid) {
  	const filteredEntries = entries.filter(entry => {
  		return (entry['locale'] === language && entry.publish_details.length > 0)
  	})

  	const flatEntries = filteredEntries.map(entry => {
  		let workflow = ''
	  	const envArr = []
	  	entry.publish_details.forEach(env => {
  			envArr.push(JSON.stringify([environments[env['environment']], env['locale']]))
  			// envArr.push(JSON.stringify({ environment: environments[env['environment']], locale: env['locale']}))
	  	})
  		// for (let env in entry.publish_details) {
  		// 	debugger
  		// 	envArr.push([environments[env['environment']], env['locale']])
  		// }
  		delete entry.publish_details
  		if ('_workflow' in entry) {
  			workflow = entry['_workflow']['name']
  			delete entry['_workflow']
  		}
  		entry['publish_details'] = envArr
  		entry['_workflow'] = workflow
  		entry['ACL'] = JSON.stringify({}) // setting ACL to empty obj
  		entry['content_type_uid'] = contentTypeUid // content_type_uid is being returned as 'uid' from the sdk for some reason
  		// entry['url'] might also be wrong
  		delete entry.stackHeaders
  		delete entry.update
  		delete entry.delete
  		delete entry.fetch
  		delete entry.publish
  		delete entry.unpublish
  		delete entry.import
  		return entry
  	})

  	debugger
  	return flatEntries
  }

  getEnvironments(stackApiKey) {
  	let result = {}
  	return this.managementAPIClient.stack({api_key: stackApiKey}).environment().query().find().then(environments => {
  		environments.items.forEach(env => { result[env['uid']] = env['name']})
	  	return result
  	})
  }

  write(entries, fileName) {
		const ws = fs.createWriteStream(fileName)

  	this.log(`Writing entries to file: ${fileName}`)
  	fastcsv
    .write(entries, {headers: true})
    .pipe(ws)
  }

  startupQuestions() {
  	return new Promise(resolve => {
  		let actions = [{
	  		type: 'list',
	  		name: 'action',
	  		message: 'Choose Action',
	  		choices: ['Export Entries to CSV', 'Export Organization Users to CSV', 'Exit'],
	  	}]
	  	inquirer.prompt(actions).then(answers => {
	  		if(answers.action === 'Exit')
	  			this.exitProgram()
	  		resolve(answers.action)
	  	})
  	})
  }

  chooseOrganization() {
  	return new Promise(async resolve => {
  		let organizations = await this.getOrganizations()
	  	let orgList = Object.keys(organizations)
	  	orgList.push(config.cancelString)

	  	let chooseOrganization = [{
	  		type: 'list',
	  		name: 'chosenOrg',
	  		message: 'Choose an Organization',
	  		choices: orgList
	  	}]
	  	inquirer.prompt(chooseOrganization).then(({chosenOrg}) => {
	  		if (chosenOrg === config.cancelString)
	  			this.exitProgram()
	  		resolve({ name: chosenOrg, uid: organizations[chosenOrg] })
	  	})
  	})
  }

  getOrganizations() {
  	return new Promise(resolve => {
  		let result = {}
	  	this.managementAPIClient.organization().fetchAll().then(organizations => {
	  		organizations.items.forEach(org => {
		  		result[org.name] = org.uid
		  	})
		  	resolve(result)
	  	})
  	})
  }

  chooseStack(orgUid) {
  	return new Promise(async resolve => {
  		let stacks = await this.getStacks(orgUid)
  		let stackList = Object.keys(stacks)
  		stackList.push(config.cancelString)

  		let chooseStack = [{
  			type: 'list',
  			name: 'chosenStack',
  			message: 'Choose a Stack',
  			choices: stackList
  		}]

  		inquirer.prompt(chooseStack).then(({chosenStack}) => {
  			if (chosenStack === config.cancelString)
	  			this.exitProgram()
	  		resolve({ name: chosenStack, apiKey: stacks[chosenStack] })
  		})
  	})
  }

  getStacks(orgUid) {
  	// Adding a query object in query, because it throws an error
  	// the error is coming from query function lib/entity.js, @contentstack/management pacakge
  	// where params.query is being set
  	return new Promise(resolve => {
  		let result = {}
  		this.managementAPIClient.stack({organization_uid: orgUid}).query({query: {}}).find().then(stacks => {
  			stacks.items.forEach(stack => {
  				result[stack.name] = stack.api_key
  			})
  			resolve(result)
  		})
  	})
  }

  chooseContentType(stackApiKey) {
  	return new Promise(async resolve => {
  		let contentTypes = await this.getContentTypes(stackApiKey)
  		let contentTypesList = Object.keys(contentTypes)
  		contentTypesList.push(config.cancelString)

  		let chooseContentType = [{
  			type: 'list',
  			message: 'Choose Content Type',
  			choices: contentTypesList,
  			name: 'chosenContentType'
  		}]

  		inquirer.prompt(chooseContentType).then(({chosenContentType}) => {
  			if (chosenContentType === config.cancelString)
	  			this.exitProgram()
	  		resolve({ name: chosenContentType, uid: contentTypes[chosenContentType] })
  		})

  	})
  }

  getContentTypes(stackApiKey) {
  	return new Promise(resolve => {
  		let result = {}
  		this.managementAPIClient.stack({api_key: stackApiKey}).contentType().query().find().then(contentTypes => {
  			contentTypes.items.forEach(contentType => {
  				result[contentType.title] = contentType.uid
  			})
  			resolve(result)
  		})
  	})
  }

  chooseLanguage(stackApiKey) {
  	return new Promise(async resolve => {
  		let languages = await this.getLanguages(stackApiKey)
	  	let languagesList = Object.keys(languages)
	  	languagesList.push(config.cancelString)

	  	let chooseLanguage = [{
	  		type: 'list',
	  		message: 'Choose Language',
	  		choices: languagesList,
	  		name: 'chosenLanguage'
	  	}]

	  	inquirer.prompt(chooseLanguage).then(({chosenLanguage}) => {
				if (chosenLanguage === config.cancelString)
	  			this.exitProgram()
	  		resolve({ name: chosenLanguage, code: languages[chosenLanguage] })
			})
  	})
  }

  getLanguages(stackApiKey) {
  	return new Promise(resolve => {
  		let result = {}
	  	this.managementAPIClient.stack({api_key: stackApiKey}).locale().query().find().then(languages => {
	  		languages.items.forEach(language => {
	  			result[language.name] = language.code
	  		})
	  		resolve(result)
	  	})
  	})
  }

  exitProgram() {
  	debug("Exiting")
  	process.exit()
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
