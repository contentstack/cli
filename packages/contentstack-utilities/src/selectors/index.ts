import * as ora from 'ora'
import {default as configHandler} from '../config-handler'
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

const config = configHandler.init();
const inquirer = require('inquirer')
inquirer.registerPrompt('search-list', require('inquirer-search-list'))
inquirer.registerPrompt('search-checkbox', require('inquirer-search-checkbox'))
const ContentstackManagementSDK = require('@contentstack/management')

/**
 * Organization selector, it allows the user to select an organization from the list of available organizations
 * @param client A management API client created from management-sdk 
 * @param {string} [displayMessage] The message that needs to be displayed to the user
 * @param {string } [orgUid] UID for an organization that is already chosen from the backend
 * @returns {Promise} The uid and name for the selected organiztion
 */
export function chooseOrganization(client: any, displayMessage?: string, orgUid?: string): Promise<selectedOrganization> {
	return new Promise(async (resolve, reject) => {
		try {
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
					validate: shouldNotBeEmpty
				}
				inquirer.prompt(inquirerConfig).then(({chosenOrganization}: {chosenOrganization: string}) => {
					resolve({orgUid: orgMap[chosenOrganization], orgName: chosenOrganization})
				})
			}
		} catch (error) {
			reject(error)
		}
	})
}

/**
 * Stack selector, it allows the user to select a stack from a list of available stacks
 * @param client A management API client created from management-sdk
 * @param {string} organizationId The id of the organization, from where the stacks are to be fetched
 * @param {string} [displayMessage] The message that needs to be displayed to the user
 * @returns {Promise} The api_key and name for the selected stack
 */
export function chooseStack(client: any, organizationId: string, displayMessage?: string) : Promise<Stack> {
	return new Promise(async (resolve, reject) => {
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

/**
 * Content Type Selector, It allows the user to select a content type from a list of available content types
 * @param stack The stack method created from contentstack management sdk
 * @param {string} [displayMessage] The message that needs to be displayed to the user
 * @returns {Promise} The uid and title of the selected content type
 */
export function chooseContentType(stack: any, displayMessage?: string): Promise<ContentType> {
	return new Promise(async (resolve, reject) => {
		try {
			const spinner = ora('Loading Content Types').start()
			let contentTypes = await getAll(stack.contentType())
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
/**
 * Entry Selector, It allows the user to select an entry from the list of available entries
 * @param contentType The stack method created from contentstack management sdk
 * @param displayMessage 
 * @returns {Promise} The uid and title of the selected entry
 */
export function chooseEntry(contentType: any, displayMessage?: string): Promise<Entry> {
	return new Promise(async (resolve, reject) => {
		try {
			const spinner = ora('Loading Entries').start()
			let entries = await getAll(contentType.entry())
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
/**
 * Content Types Selector, it allows the user to select multiple content types from a list of available content types
 * @param stack The stack method created from contentstack management sdk
 * @param {string} [displayMessage] The message that needs to be displayed to the user
 * @returns {Promise} An array of objects containing uid and title for all selected content types
 */
export function chooseContentTypes(stack: any, displayMessage?: string): Promise<ContentType[]> {
	return new Promise(async (resolve, reject) => {
		try {
			const spinner = ora('Loading Content Types').start()
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
			inquirer.prompt(inquirerConfig).then(({ chosenContentTypes }: { chosenContentTypes: string[]}) => {
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
/**
 * Environments selector, it allows the user to select multiple environments from a list of available environments
 * @param stack The stack method created from contentstack management sdk
 * @param {string} [displayMessage] The message that needs to be displayed to the user
 * @returns {Promise} An array of objects containing uid and name for all selected environments
 */
export function chooseEnvironments(stack: any, displayMessage?: string): Promise<Environment[]> {
	return new Promise(async (resolve, reject) => {
		try {
			const spinner = ora('Loading Environments').start()
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
/**
 * Environment Selector, it allows the user to select an environment from a list of available environments
 * @param stack The stack method created from contentstack management sdk
 * @param {string} [displayMessage] The message that needs to be displayed to the user
 * @returns {Promise} An object containing uid and name of the selected environment
 */
export function chooseEnvironment(stack: any, displayMessage?: string): Promise<Environment> {
	return new Promise(async (resolve, reject) => {
		try {
			const spinner = ora('Loading Environments').start()
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
/**
 * Locales selector, it allows the user to select multiple locales from a list of available locales
 * @param stack The stack method created from contentstack management sdk
 * @param {string} [displayMessage] The message that needs to be displayed to the user
 * @returns {Promise} An array of objects containing code and name for all selected locales
 */
export function chooseLocales(stack: any, displayMessage?: string): Promise<Locale[]> {
	return new Promise(async (resolve, reject) => {
		try {
			const spinner = ora('Loading Locales').start()
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
/**
 * Locale Selector, it allows the user to select a locale from a list of available locales
 * @param stack The stack method created from contentstack management sdk
 * @param {string} [displayMessage] The message that needs to be displayed to the user
 * @returns {Promise} An object containing code and name for the selected locale
 */
export function chooseLocale(stack: any, displayMessage?: string): Promise<Locale> {
	return new Promise(async (resolve, reject) => {
		try {
			const spinner = ora('Loading Locales').start()
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
/**
 * Token alias selector, allows the user to select the management token alias they want to use
 * @returns {Promise} An object containing apiKey and token for the selected alias
 */
export function chooseTokenAlias(): Promise<Token> {
	return new Promise(async (resolve, reject) => {
		const tokens = config.tokens
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
/**
 * Delivery token alias selector, allows the user to select a delivery token alias they want to use
 * @returns {Promise} An object containing apiKey and token for the selected alias
 */
export function chooseDeliveryTokenAlias(): Promise<Token> {
	return new Promise(async (resolve, reject) => {
		const tokens = config.tokens
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
/**
 * A method to handle pagination
 * @param element 
 * @param skip 
 * @returns The fetched result
 */
async function getAll (element: any, skip: number=0): Promise<any> {
	return new Promise(async resolve => {
		let result: any[] = []
		result = await fetch(element, skip, result)
		resolve(result)
	})
}
/**
 * A method to perform actual http requests
 * @param element 
 * @param skip 
 * @param accumulator 
 * @returns The consolidated result after handling pagination
 */
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