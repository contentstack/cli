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

export function chooseContentType(stackApiKey: string, displayMessage?: string, region?: string): Promise<ContentType> {
	return new Promise(async (resolve, reject) => {
		const command = new Command()
		command.managementAPIClient = {host: command.cmaHost, authtoken: command.authToken}
		const client = command.managementAPIClient
		try {
			const spinner = ora('Loading Content Types').start()
			let {items: contentTypes} = await client.stack({api_key: stackApiKey}).contentType().query({include_count: true}).find()
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

export function chooseEntry(contentTypeUid: string, stackApiKey: string, displayMessage?: string, region?: string): Promise<Entry> {
	return new Promise(async (resolve, reject) => {
		const command = new Command()
		command.managementAPIClient = {host: command.cmaHost, authtoken: command.authToken}
		const client = command.managementAPIClient
		try {
			const spinner = ora('Loading Entries').start()
			// let {items: entries} = await client.stack({api_key: stackApiKey}).contentType(contentTypeUid).entry().query({include_count: true}).find()
			let entries = await getAll(client.stack({api_key: stackApiKey}).contentType(contentTypeUid).entry(), 'entry')
			spinner.stop()
			let entryMap: any = {}
			entries.forEach((entry: Entry) => {
				entryMap[entry.title] = entry.uid
			})
			const entryList = Object.keys(entryMap)
			console.log('entryList.length', entryList.length)
			let inquirerConfig = {
				type: 'list',
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

async function getAll (element: any, type: string, skip: number=0): Promise<any> {
	let elements: any = []
	switch(type) {
		case 'entry': {
			try {
				let queryParams = { include_count: true, skip: (skip) ? skip : 0 }
				let { items: entries, count: count } = await element.query(queryParams).find()
				elements.concat(entries)
				while (queryParams.skip !== count) {
					queryParams.skip += 100
					let { items: data } = await element.query(queryParams).find()
					elements = elements.concat(data)
				}
				return new Promise(resolve => resolve(elements))
			} catch (error) {
				console.log(error)
			}
		}
		case 'content-type': {

		}
		case 'stack': {

		}
	}
}

async function callMe() {
	// let organization = await chooseOrganization()
	// console.log(organization)

	// let stack = await chooseStack(organization.orgUid)
	// console.log(stack)

	// let contentType = await chooseContentType(stack.api_key)
	// console.log(contentType)

	// let entry = await chooseEntry(contentType.uid, stack.api_key)
	// console.log(entry)

	let entry = await chooseEntry('major_B', 'blt4e983bb9de3a2bf8')
	console.log(entry)
}

callMe()