import ora from 'ora'
const inquirer = require('inquirer')
inquirer.registerPrompt('search-list', require('inquirer-search-list'))
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
					type: 'search-list',
					name: 'chosenOrganization',
					message: displayMessage || 'Choose an organization',
					choices: orgList,
					loop: false,
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

export function chooseStack(organizationId: string, displayMessage?: string, region?: string) : Promise<Stack> {
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
				type: 'search-list',
				name: 'chosenStack',
				choices: stackList,
				message: displayMessage || 'Choose a stack',
				loop: false,
			}
			inquirer.prompt(inquirerConfig).then(({chosenStack}: {chosenStack: string}) => {
				resolve({api_key: stackMap[chosenStack], name: chosenStack})
			})
		} catch (error) {
			console.error(error.message)
		}
	})
}

export function chooseContentType(stackApiKey: string, displayMessage?: string, region?: string): Promise<ContentType> {
	return new Promise(async (resolve, reject) => {
		const command = new Command()
		command.managementAPIClient = {host: command.cmaHost, authtoken: command.authToken}
		const client = command.managementAPIClient
		try {
			const spinner = ora('Loading Content Types').start()
			// let {items: contentTypes} = await client.stack({api_key: stackApiKey}).contentType().query({include_count: true}).find()
			let contentTypes = await getAll(client.stack({api_key: stackApiKey}).contentType())
			spinner.stop()
			let contentTypeMap: any = {}
			contentTypes.forEach((contentType: ContentType) => {
				contentTypeMap[contentType.title] = contentType.uid
			})
			const contentTypeList = Object.keys(contentTypeMap)
			let inquirerConfig = {
				type: 'search-list',
				name: 'chosenContentType',
				choices: contentTypeList,
				message: displayMessage || 'Choose a content type',
				loop: false,
			}
			inquirer.prompt(inquirerConfig).then(({chosenContentType}: {chosenContentType: string}) => {
				resolve({uid: contentTypeMap[chosenContentType], title: chosenContentType})
			})
		} catch (error) {
			console.error(error.message)
		}
	})	
}

export function chooseEntry(contentTypeUid: string, stackApiKey: string, displayMessage?: string, region?: string): Promise<Entry> {
	return new Promise(async (resolve, reject) => {
		const command = new Command()
		command.managementAPIClient = {host: command.cmaHost, authtoken: command.authToken}
		const client = command.managementAPIClient
		try {
			const spinner = ora('Loading Entries').start()
			let entries = await getAll(client.stack({api_key: stackApiKey}).contentType(contentTypeUid).entry())
			spinner.stop()
			let entryMap: any = {}
			entries.forEach((entry: Entry) => {
				entryMap[entry.title] = entry.uid
			})
			const entryList = Object.keys(entryMap)
			let inquirerConfig = {
				type: 'search-list',
				name: 'chosenEntry',
				choices: entryList,
				message: displayMessage || 'Choose an entry',
				loop: false
			}
			inquirer.prompt(inquirerConfig).then(({chosenEntry}: {chosenEntry: string}) => {
				resolve({uid: entryMap[chosenEntry], title: chosenEntry})
			})
		} catch (error) {
			console.error(error.message)
		}
	})	
}

async function getAll (element: any, skip: number=0): Promise<any> {
	return new Promise(async resolve => {
		let result: any[] = []
		result = await fetch(element, skip, result)
		resolve(result)
	})
}

async function fetch(element: any, skip: number, accumulator: any[]): Promise<any[]> {
	return new Promise(async resolve => {
		let queryParams = {include_count: true, skip: skip}
		let {items: result, count: count} = await element.query(queryParams).find()
		accumulator = accumulator.concat(result)
		skip += result.length
		if (skip < count)
			return resolve(await fetch(element, skip, accumulator))
		return resolve(accumulator)
	})
}

// async function callMe() {
// 	let organization = await chooseOrganization()
// 	console.log(organization)

// 	let stack = await chooseStack(organization.orgUid)
// 	console.log(stack)

// 	let contentType = await chooseContentType(stack.api_key)
// 	console.log(contentType)

// 	// let entry = await chooseEntry(contentType.uid, stack.api_key)
// 	// console.log(entry)

// 	let entry = await chooseEntry(contentType.uid, stack.api_key)
// 	console.log(entry)
// }

// callMe()