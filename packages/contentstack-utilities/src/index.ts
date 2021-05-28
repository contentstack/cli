import ora from 'ora'
const inquirer = require('inquirer')
const {Command} = require('@contentstack/cli-command')
const ContentstackManagementSDK = require('@contentstack/management')

interface Organization {
	uid: string,
	name: string,
}

interface selectedOrganization {
	orgUid: string,
	orgName: string,
}

interface Stack {
	name: string,
	api_key: string,
}

interface ContentType {
	uid: string,
	title: string,
}

interface Entry {
	uid: string,
	title: string,
}

export function chooseOrganization(displayMessage?: string, region?: string, orgUid?: string): Promise<selectedOrganization> {
	return new Promise(async (resolve, reject) => {
		try {
			const command = new Command()
			command.managementAPIClient = {host: command.cmaHost, authtoken: command.authToken}
			const client = command.managementAPIClient
			const spinner = ora('Loading Organizations').start()
			let {items: organizations} = await client.organization().fetchAll()
			spinner.stop()
			let orgMap: any = {}
			if (orgUid) {
				organizations.forEach((org: Organization) => {
					orgMap[org.uid] = org.name
				})
				if (orgMap[orgUid]) {
					resolve({orgUid: orgUid, orgName: orgMap[orgUid]})
				} else {
					return reject(new Error('The given orgUid doesn\'t exist or you might not have access to it.'))
				}
			} else {
				organizations.forEach((org: Organization) => {
					orgMap[org.name] = org.uid
				})
				const orgList = Object.keys(orgMap)
				let inquirerConfig = {
					type: 'list',
					name: 'chosenOrganization',
					message: displayMessage || 'Choose an organization',
					choices: orgList
				}
				debugger
				inquirer.prompt(inquirerConfig).then(({chosenOrganization}: {chosenOrganization: string}) => {
					debugger
					resolve({orgUid: orgMap[chosenOrganization], orgName: chosenOrganization})
				})
			}
		} catch (error) {
			reject(error)
		}
	})
}

export function chooseStack(organizationId: string, displayMessage?: string, region?: string) {
	return new Promise(async (resolve, reject) => {
		const command = new Command()
		command.managementAPIClient = {host: command.cmaHost, authtoken: command.authToken}
		const client = command.managementAPIClient
		try {
			const spinner = ora('Loading Stacks').start()
			let {items: stacks} = await client.stack({organization_uid: organizationId}).query({query: {}}).find()
			spinner.stop()
			let stackMap: any = {}
			stacks.forEach((stack: Stack) => {
				stackMap[stack.name] = stack.api_key
			})
			const stackList = Object.keys(stackMap)
			let inquirerConfig = {
				type: 'list',
				name: 'chosenStack',
				choices: stackList,
				message: displayMessage || 'Choose a stack'
			}
			inquirer.prompt(inquirerConfig).then(({chosenStack}: {chosenStack: string}) => {
				resolve({api_key: stackMap[chosenStack], name: chosenStack})
			})
		} catch (error) {
			console.error(error.message)
		}
	})
}

export function chooseContentType(stackApiKey: string, displayMessage?: string, region?: string) {
	return new Promise(async (resolve, reject) => {
		const command = new Command()
		command.managementAPIClient = {host: command.cmaHost, authtoken: command.authToken}
		const client = command.managementAPIClient
		try {
			const spinner = ora('Loading Content Types').start()
			let {items: contentTypes} = await client.stack({api_key: stackApiKey}).contentType().query().find()
			spinner.stop()
			let contentTypeMap: any = {}
			contentTypes.forEach((contentType: ContentType) => {
				contentTypeMap[contentType.title] = contentType.uid
			})
			const contentTypeList = Object.keys(contentTypeMap)
			let inquirerConfig = {
				type: 'list',
				name: 'chosenContentType',
				choices: contentTypeList,
				message: displayMessage || 'Choose a content type'
			}
			inquirer.prompt(inquirerConfig).then(({chosenContentType}: {chosenContentType: string}) => {
				resolve({uid: contentTypeMap[chosenContentType], title: chosenContentType})
			})
		} catch (error) {
			console.error(error.message)
		}
	})	
}

export function chooseEntry(contentTypeUid: string, stackApiKey: string, displayMessage?: string, region?: string) {
	return new Promise(async (resolve, reject) => {
		const command = new Command()
		command.managementAPIClient = {host: command.cmaHost, authtoken: command.authToken}
		const client = command.managementAPIClient
		try {
			const spinner = ora('Loading Entries').start()
			let {items: entries} = await client.stack({api_key: stackApiKey}).contentType(contentTypeUid).entry().query().find()
			spinner.stop()
			let entryMap: any = {}
			entries.forEach((entry: Entry) => {
				entryMap[entry.title] = entry.uid
			})
			const entryList = Object.keys(entryMap)
			let inquirerConfig = {
				type: 'list',
				name: 'chosenEntry',
				choices: entryList,
				message: displayMessage || 'Choose an entry'
			}
			inquirer.prompt(inquirerConfig).then(({chosenEntry}: {chosenEntry: string}) => {
				resolve({uid: entryMap[chosenEntry], title: chosenEntry})
			})
		} catch (error) {
			console.error(error.message)
		}
	})	
}

async function callMe() {
	let organization: selectedOrganization
	try {
		organization = await chooseOrganization()
		console.log(organization)
	} catch (error) {
		console.error(error.message)
	}

	// let stack = await chooseStack(organization.orgUid)
	// console.log(stack)
}

callMe()