import ora from 'ora'
import { default as CLIError } from '../cli-error';
import { default as config } from '../config-handler';
import {
	Token,
	Organization,
	selectedOrganization,
	Stack,
	ContentType,
	Environment,
	Entry,
	Locale
} from './interfaces'
import { shouldNotBeEmpty } from './validations';
import ContentstackManagementSDK from '@contentstack/management';

const inquirer = require('inquirer')
inquirer.registerPrompt('search-list', require('inquirer-search-list'))
inquirer.registerPrompt('search-checkbox', require('inquirer-search-checkbox'))

interface Region {
  name: string;
  cma: string;
  cda: string;
}

let _region: Region;
let _authToken: string;
let _managementAPIClient: ContentstackManagementSDK.ContentstackClient;

const region = (): Region => {
	if (!_region) {
		_region = config.get('region');
	}

	return _region;
}

const cmaHost = () => {
	let cma = region().cma;
	if (cma.startsWith('http')) {
		const u = new URL(cma);
		if (u.host) return u.host;
	}
	return cma;
}

const managementAPIClient = (params) => {
	if (params) {
		_managementAPIClient = ContentstackManagementSDK.client(params)
	} else if (!_managementAPIClient) {
		_managementAPIClient = ContentstackManagementSDK.client({ host: cmaHost() });
	}

	return _managementAPIClient;
}

const authToken = () => {
	if (!_authToken) {
		_authToken = config.get('authtoken');
	}
	if (!_authToken) {
		throw new CLIError('You are not logged in. Please login with command $ csdx auth:login');
	}

	return _authToken;
}

export function chooseOrganization(client: any, displayMessage?: string, region?: string, orgUid?: string): Promise<selectedOrganization> {
	return new Promise(async (resolve, reject) => {
		try {
			const spinner = ora('Loading Organizations').start()
			let { items: organizations } = await client.organization().fetchAll()
			spinner.stop()
			let orgMap: any = {}
			if (orgUid) {
				organizations.forEach((org: Organization) => {
					orgMap[org.uid] = org.name
				})
				if (orgMap[orgUid]) {
					resolve({ orgUid: orgUid, orgName: orgMap[orgUid] })
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
					validate: shouldNotBeEmpty
				}
				inquirer.prompt(inquirerConfig).then(({ chosenOrganization }: { chosenOrganization: string }) => {
					resolve({ orgUid: orgMap[chosenOrganization], orgName: chosenOrganization })
				})
			}
		} catch (error) {
			reject(error)
		}
	})
}

export function chooseStack(client: any, organizationId: string, displayMessage?: string, region?: string): Promise<Stack> {
	return new Promise(async (resolve, reject) => {
		try {
			const spinner = ora('Loading Stacks').start()
			let { items: stacks } = await client.stack({ organization_uid: organizationId }).query({ query: {} }).find()
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
			inquirer.prompt(inquirerConfig).then(({ chosenStack }: { chosenStack: string }) => {
				resolve({ api_key: stackMap[chosenStack], name: chosenStack })
			})
		} catch (error) {
			console.error(error.message)
		}
	})
}

export function chooseContentType(stackApiKey: string, displayMessage?: string, region?: string): Promise<ContentType> {
	return new Promise(async (resolve, reject) => {
		const client = managementAPIClient({ host: cmaHost(), authtoken: authToken() })

		try {
			const spinner = ora('Loading Content Types').start()
			// let {items: contentTypes} = await client.stack({api_key: stackApiKey}).contentType().query({include_count: true}).find()
			let contentTypes = await getAll(client.stack({ api_key: stackApiKey }).contentType())
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
			inquirer.prompt(inquirerConfig).then(({ chosenContentType }: { chosenContentType: string }) => {
				resolve({ uid: contentTypeMap[chosenContentType], title: chosenContentType })
			})
		} catch (error) {
			console.error(error.message)
		}
	})
}

export function chooseEntry(contentTypeUid: string, stackApiKey: string, displayMessage?: string, region?: string): Promise<Entry> {
	return new Promise(async (resolve, reject) => {
		const client = managementAPIClient({ host: cmaHost(), authtoken: authToken() })

		try {
			const spinner = ora('Loading Entries').start()
			let entries = await getAll(client.stack({ api_key: stackApiKey }).contentType(contentTypeUid).entry())
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
			inquirer.prompt(inquirerConfig).then(({ chosenEntry }: { chosenEntry: string }) => {
				resolve({ uid: entryMap[chosenEntry], title: chosenEntry })
			})
		} catch (error) {
			console.error(error.message)
		}
	})
}

export function chooseContentTypes(stack: any, displayMessage?: string): Promise<ContentType[]> {
	return new Promise(async (resolve, reject) => {
		try {
			const spinner = ora('Loading Content Types').start()
			// let {items: contentTypes} = await client.stack({api_key: stackApiKey}).contentType().query({include_count: true}).find()
			let contentTypes = await getAll(stack.contentType())
			spinner.stop()
			let contentTypeMap: any = {}
			contentTypes.forEach((contentType: ContentType) => {
				contentTypeMap[contentType.title] = contentType.uid
			})
			const contentTypeList = Object.keys(contentTypeMap)
			let inquirerConfig = {
				type: 'search-checkbox',
				name: 'chosenContentTypes',
				choices: contentTypeList,
				message: displayMessage || 'Choose a content type',
				loop: false,
			}
			inquirer.prompt(inquirerConfig).then(({ chosenContentTypes }: { chosenContentTypes: string[] }) => {
				let result: ContentType[] = chosenContentTypes.map(ct => {
					let foo: ContentType = { uid: contentTypeMap[ct], title: ct }
					return foo
				})
				resolve(result)
			})
		} catch (error) {
			console.error(error.message)
		}
	})
}

export function chooseEnvironments(stack: any, displayMessage?: string): Promise<Environment[]> {
	return new Promise(async (resolve, reject) => {
		try {
			const spinner = ora('Loading Environments').start()
			// let {items: contentTypes} = await client.stack({api_key: stackApiKey}).contentType().query({include_count: true}).find()
			let environments = await getAll(stack.environment())
			spinner.stop()
			let environmentMap: any = {}
			environments.forEach((environment: Environment) => {
				environmentMap[environment.name] = environment.uid
			})
			const environmentList = Object.keys(environmentMap)
			let inquirerConfig = {
				type: 'search-checkbox',
				name: 'chosenEnvironments',
				choices: environmentList,
				message: displayMessage || 'Choose an environment',
				loop: false,
				validate: shouldNotBeEmpty
			}
			inquirer.prompt(inquirerConfig).then(({ chosenEnvironments }: { chosenEnvironments: string[] }) => {
				let result: Environment[] = chosenEnvironments.map(env => {
					let foo: Environment = { uid: environmentMap[env], name: env }
					return foo
				})
				resolve(result)
			})
		} catch (error) {
			console.error(error.message)
		}
	})
}

export function chooseEnvironment(stack: any, displayMessage?: string): Promise<Environment> {
	return new Promise(async (resolve, reject) => {
		try {
			const spinner = ora('Loading Environments').start()
			// let {items: contentTypes} = await client.stack({api_key: stackApiKey}).contentType().query({include_count: true}).find()
			let environments = await getAll(stack.environment())
			spinner.stop()
			let environmentMap: any = {}
			environments.forEach((environment: Environment) => {
				environmentMap[environment.name] = environment.uid
			})
			const environmentList = Object.keys(environmentMap)
			let inquirerConfig = {
				type: 'search-list',
				name: 'chosenEnvironment',
				choices: environmentList,
				message: displayMessage || 'Choose an environment',
				loop: false,
				validate: shouldNotBeEmpty
			}
			inquirer.prompt(inquirerConfig).then(({ chosenEnvironment }: { chosenEnvironment: string }) => {
				let result: Environment = { uid: environmentMap[chosenEnvironment], name: chosenEnvironment }
				resolve(result)
			})
		} catch (error) {
			console.error(error.message)
		}
	})
}

export function chooseLocales(stack: any, displayMessage?: string): Promise<Locale[]> {
	return new Promise(async (resolve, reject) => {
		try {
			const spinner = ora('Loading Locales').start()
			// let {items: contentTypes} = await client.stack({api_key: stackApiKey}).contentType().query({include_count: true}).find()
			let locales = await getAll(stack.locale())
			spinner.stop()
			let localeMap: any = {}
			locales.forEach((locale: Locale) => {
				localeMap[locale.name] = locale.code
			})
			const localeList = Object.keys(localeMap)
			let inquirerConfig = {
				type: 'search-checkbox',
				name: 'chosenLocales',
				choices: localeList,
				message: displayMessage || 'Choose locales',
				loop: false,
				validate: shouldNotBeEmpty,
			}
			inquirer.prompt(inquirerConfig).then(({ chosenLocales }: { chosenLocales: string[] }) => {
				let result: Locale[] = chosenLocales.map(locale => {
					let foo: Locale = { code: localeMap[locale], name: locale }
					return foo
				})
				resolve(result)
			})
		} catch (error) {
			console.error(error.message)
		}
	})
}

export function chooseLocale(stack: any, displayMessage?: string, defaultLocale?: Locale): Promise<Locale> {
	return new Promise(async (resolve, reject) => {
		try {
			const spinner = ora('Loading Locales').start()
			// let {items: contentTypes} = await client.stack({api_key: stackApiKey}).contentType().query({include_count: true}).find()
			let locales = await getAll(stack.locale())
			spinner.stop()
			let localeMap: any = {}
			locales.forEach((locale: Locale) => {
				localeMap[locale.name] = locale.code
			})
			const localeList = Object.keys(localeMap)
			let inquirerConfig = {
				type: 'search-list',
				name: 'chosenLocale',
				choices: localeList,
				default: defaultLocale,
				message: displayMessage || 'Choose locale',
				loop: false,
				validate: shouldNotBeEmpty
			}
			inquirer.prompt(inquirerConfig).then(({ chosenLocale }: { chosenLocale: string }) => {
				let result: Locale = { code: localeMap[chosenLocale], name: chosenLocale }
				resolve(result)
			})
		} catch (error) {
			console.error(error.message)
		}
	})
}

export function chooseTokenAlias(): Promise<Token> {
	return new Promise(async (resolve, reject) => {
		const tokens = config.get('tokens')
		const tokenList = Object.keys(tokens).filter((token: string) => tokens[token].type === 'management')
		let inquirerConfig = {
			type: 'search-list',
			name: 'chosenToken',
			choices: tokenList,
			message: 'Choose an alias to use',
			loop: false,
			validate: shouldNotBeEmpty,
		}
		inquirer.prompt(inquirerConfig).then(({ chosenToken }: { chosenToken: string }) => {
			resolve({ apiKey: tokens[chosenToken].apiKey, token: tokens[chosenToken].token })
		})
	})
}

export function chooseDeliveryTokenAlias(): Promise<Token> {
	return new Promise(async (resolve, reject) => {
		const tokens = config.get('tokens')
		const tokenList = Object.keys(tokens).filter((token: string) => tokens[token].type === 'delivery')
		let inquirerConfig = {
			type: 'search-list',
			name: 'chosenToken',
			choices: tokenList,
			message: 'Choose an alias to use',
			loop: false,
			validate: shouldNotBeEmpty,
		}
		inquirer.prompt(inquirerConfig).then(({ chosenToken }: { chosenToken: string }) => {
			resolve({ apiKey: tokens[chosenToken].apiKey, token: tokens[chosenToken].token })
		})
	})
}

async function getAll(element: any, skip: number = 0): Promise<any> {
	return new Promise(async resolve => {
		let result: any[] = []
		result = await fetch(element, skip, result)
		resolve(result)
	})
}

async function fetch(element: any, skip: number, accumulator: any[]): Promise<any[]> {
	return new Promise(async resolve => {
		let queryParams = { include_count: true, skip: skip }
		let { items: result, count: count } = await element.query(queryParams).find()
		accumulator = accumulator.concat(result)
		skip += result.length
		if (skip < count)
			return resolve(await fetch(element, skip, accumulator))
		return resolve(accumulator)
	})
}

// async function callMe() {
// 	// let organization = await chooseOrganization()
// 	// console.log(organization)

// 	// let stack = await chooseStack(organization.orgUid)
// 	// console.log(stack)

// 	// let contentType = await chooseContentType(stack.api_key)
// 	// console.log(contentType)

// 	// let entry = await chooseEntry(contentType.uid, stack.api_key)
// 	// console.log(entry)

// 	// let entry = await chooseEntry(contentType.uid, stack.api_key)
// 	// console.log(entry)

// 	let token = await chooseTokenAlias()
// 	console.log(token)
// }

// callMe()