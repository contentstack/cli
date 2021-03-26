const inquirer = require('inquirer')
const axios = require('axios')
const os = require('os')
const config = require('./config.js')
const fastcsv = require('fast-csv')
const mkdirp = require('mkdirp')
const fs = require('fs')
const debug = require('debug')("export-to-csv")
const directory = './data'
const delimeter = (os.platform() === 'win32') ? '\\' : '/'

function chooseOrganization(managementAPIClient, action) {
	return new Promise(async resolve => {
		let organizations
		if (action === config.exportUsers) {
			organizations = await getOrganizationsWhereUserIsAdmin(managementAPIClient)
		} else {
			organizations = await getOrganizations(managementAPIClient)		
		}
		let orgList = Object.keys(organizations)
		orgList.push(config.cancelString)
			let chooseOrganization = [{
			type: 'list',
			name: 'chosenOrg',
			message: 'Choose an Organization',
			choices: orgList,
			loop: false
		}]
		inquirer.prompt(chooseOrganization).then(({chosenOrg}) => {
			if (chosenOrg === config.cancelString)
				exitProgram()
			resolve({ name: chosenOrg, uid: organizations[chosenOrg] })
		})
	})
}

function getOrganizations(managementAPIClient) {
	return new Promise(resolve => {
		let result = {}

		managementAPIClient.organization().fetchAll().then(organizations => {
			organizations.items.forEach(org => {
				result[org.name] = org.uid
			})
			resolve(result)
		})
	})
}

function getOrganizationsWhereUserIsAdmin(managementAPIClient) {
	return new Promise(resolve => {
		let result = {}
		managementAPIClient
		.getUser({include_orgs_roles: true})
		.then(response => {
			let organizations = response.organizations.filter(org => {
				if (org.org_roles) {
					const org_role = org.org_roles.shift()
					return org_role.admin
				}
				if (org.is_owner === true)
					return true
				return false
			})
			organizations.forEach(org => {
				result[org.name] = org.uid
			})
			resolve(result)
		})
	})
}

function chooseStack(managementAPIClient, orgUid) {
	return new Promise(async resolve => {
		let stacks = await getStacks(managementAPIClient, orgUid)
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
				exitProgram()
			resolve({ name: chosenStack, apiKey: stacks[chosenStack] })
		})
	})
}

function getStacks(managementAPIClient, orgUid) {
	// Adding a query object in query, because it throws an error
	// the error is coming from query function lib/entity.js, @contentstack/management pacakge
	// where params.query is being set
	return new Promise(resolve => {
		let result = {}
		managementAPIClient.stack({organization_uid: orgUid}).query({query: {}}).find().then(stacks => {
			stacks.items.forEach(stack => {
				result[stack.name] = stack.api_key
			})
			resolve(result)
		})
	})
}

function chooseContentType(managementAPIClient, stackApiKey) {
	return new Promise(async resolve => {
		let contentTypes = await getContentTypes(managementAPIClient, stackApiKey)
		let contentTypesList = Object.values(contentTypes)
		// contentTypesList.push(config.cancelString)

		let chooseContentType = [{
			type: 'checkbox',
			message: 'Choose Content Type',
			choices: contentTypesList,
			name: 'chosenContentTypes',
			loop: false
		}]

		inquirer.prompt(chooseContentType).then(({chosenContentTypes}) => {
			// if (chosenContentType === config.cancelString)
			// 	exitProgram()
			resolve(chosenContentTypes)
		})
	})
}

function getContentTypes(managementAPIClient, stackApiKey) {
	return new Promise(resolve => {
		let result = {}
		managementAPIClient.stack({api_key: stackApiKey}).contentType().query().find().then(contentTypes => {
			contentTypes.items.forEach(contentType => {
				result[contentType.title] = contentType.uid
			})
			resolve(result)
		})
	})
}

function chooseLanguage(managementAPIClient, stackApiKey) {
	return new Promise(async resolve => {
		let languages = await getLanguages(managementAPIClient, stackApiKey)
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
				exitProgram()
			resolve({ name: chosenLanguage, code: languages[chosenLanguage] })
		})
	})
}

function getLanguages(managementAPIClient, stackApiKey) {
	return new Promise(resolve => {
		let result = {}
		managementAPIClient.stack({api_key: stackApiKey}).locale().query().find().then(languages => {
			languages.items.forEach(language => {
				result[language.name] = language.code
			})
			resolve(result)
		})
	})
}

function getEntries(managementAPIClient, stackApiKey, contentType, language) {
	return new Promise(resolve => {
		managementAPIClient
		.stack({api_key: stackApiKey})
		.contentType(contentType)
		.entry()
		.query({include_publish_details: true, locale: language})
		.find()
		.then(entries => resolve(entries))
	})
}

function getEnvironments(managementAPIClient, stackApiKey) {
	let result = {}
	return managementAPIClient.stack({api_key: stackApiKey}).environment().query().find().then(environments => {
		environments.items.forEach(env => { result[env['uid']] = env['name']})
		return result
	})
}

function exitProgram() {
	debug("Exiting")
	// eslint-disable-next-line no-undef
	process.exit()
}

function cleanEntries(entries, language, environments, contentTypeUid) {
  const filteredEntries = entries.filter(entry => {
    return (entry['locale'] === language && entry.publish_details.length > 0)
  })

  const flatEntries = filteredEntries.map(entry => {
    let workflow = ''
    const envArr = []
    entry.publish_details.forEach(env => {
      envArr.push(JSON.stringify([environments[env['environment']], env['locale']]))
    })
    delete entry.publish_details
    if ('_workflow' in entry) {
      workflow = entry['_workflow']['name']
      delete entry['_workflow']
    }
    entry = flatten(entry)
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
    delete entry.publishRequest
    return entry
  })

  return flatEntries
}

function getDateTime() {
  let date = new Date()
  let dateTime = date.toLocaleString().split(',')
  dateTime[0] = dateTime[0].split('/').join('-')
  dateTime[1] = dateTime[1].trim() // trim the space before time
  dateTime[1] = dateTime[1].split(' ').join('')
  return dateTime.join('_')
}

function write(command, entries, fileName) {
	// eslint-disable-next-line no-undef
	if (process.cwd().split(delimeter).pop() !== 'data' && !fs.existsSync(directory)) {
		mkdirp.sync(directory)
	}
	// eslint-disable-next-line no-undef
	if (process.cwd().split(delimeter).pop() !== 'data') {
		// eslint-disable-next-line no-undef
		process.chdir(directory)
	}
  // eslint-disable-next-line no-undef
  command.log(`Writing entries to file: ${process.cwd()}${delimeter}${fileName}`)
  fastcsv
  .writeToPath(fileName, entries, {headers: true})
}

function startupQuestions() {
  return new Promise(resolve => {
    let actions = [{
      type: 'list',
      name: 'action',
      message: 'Choose Action',
      choices: [config.exportEntries, config.exportUsers, 'Exit'],
    }]
    inquirer.prompt(actions).then(answers => {
      if(answers.action === 'Exit')
        exitProgram()
      resolve(answers.action)
    })
  })
}

function getOrgUsers(managementAPIClient, orgUid, ecsv) {
	return new Promise((resolve, reject) => {
		managementAPIClient
		.getUser({include_orgs_roles: true})
		.then(response => {
			let organization = response.organizations.filter(org => org.uid === orgUid).pop()
			if (organization.is_owner === true) {
				let cma = ecsv.region.cma
				let authtoken = ecsv.authToken
				return axios.get(`${cma}/v3/organizations/${organization.uid}/share`, { headers: { 'authtoken': authtoken }})
				.then(response => resolve({ items: response.data.shares }))
			}
			if (!organization.getInvitations) { 
				return reject(new Error(config.adminError)) 
			}
			organization.getInvitations().then(users => resolve(users))
		})
	})
}

function getMappedUsers(users) {
	let mappedUsers = {}
	users.items.forEach(user => { mappedUsers[user.user_uid] = user.email })
	mappedUsers['System'] = 'System'
	return mappedUsers
}

function getMappedRoles(roles) {
	let mappedRoles = {}
	roles.items.forEach(role => { mappedRoles[role.uid] = role.name })
	return mappedRoles
}

function getOrgRoles(managementAPIClient, orgUid, ecsv) {
	return new Promise((resolve, reject) => {
		managementAPIClient
		.getUser({include_orgs_roles: true})
		.then(response => {
			let organization = response.organizations.filter(org => org.uid === orgUid).pop()
			if (organization.is_owner === true) {
				let cma = ecsv.region.cma
				let authtoken = ecsv.authToken
				return axios.get(`${cma}/v3/organizations/${organization.uid}/roles`, { headers: { 'authtoken': authtoken }})
				.then(response => resolve({ items: response.data.roles }))
			}
			if (!organization.roles) { 
				return reject(new Error(config.adminError)) 
			}
			organization.roles().then(roles => resolve(roles))
		})
	})
}

function determineUserOrgRole(user, roles) {
	let roleName = 'No Role'
	let roleUid = user.org_roles || []
	if (roleUid.length > 0) {
		roleUid = roleUid.shift()
		roleName = roles[roleUid]
	}
	if (user.is_owner) {
		roleName = 'Owner'
	}
	return roleName
}

function cleanOrgUsers(orgUsers, mappedUsers, mappedRoles) {
	const userList = []
	orgUsers.items.forEach(user => {
		let invitedBy
		let formattedUser = {}
		try {
			invitedBy = mappedUsers[user['invited_by']]
		} catch (error) {
			invitedBy = 'System'
		}
		formattedUser['Email'] = user['email']
		formattedUser['User UID'] = user['user_uid']
		formattedUser['Organization Role'] = determineUserOrgRole(user, mappedRoles)
		formattedUser['Status'] = user['status']
		formattedUser['Invited By'] = invitedBy
		formattedUser['Created Time'] = user['created_at']
		formattedUser['Updated Time'] = user['updated_at']
		userList.push(formattedUser)
	})
	return userList
}

function kebabize(str) {
   return str.split(' ').map((word) => word.toLowerCase()).join('-')
}

// https://stackoverflow.com/questions/19098797/fastest-way-to-flatten-un-flatten-nested-json-objects
function flatten(data) {
    var result = {};
    function recurse (cur, prop) {
        if (Object(cur) !== cur) {
            result[prop] = cur;
        } else if (Array.isArray(cur)) {
             for(var i=0, l=cur.length; i<l; i++)
                 recurse(cur[i], prop + "[" + i + "]");
            if (l == 0)
                result[prop] = [];
        } else {
            var isEmpty = true;
            for (var p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop+"."+p : p);
            }
            if (isEmpty && prop)
                result[prop] = {};
        }
    }
    recurse(data, "");
    return result;
}

module.exports = {
	chooseOrganization: chooseOrganization,
	chooseStack: chooseStack,
  chooseContentType: chooseContentType,
  chooseLanguage: chooseLanguage,
  getEntries: getEntries,
  getEnvironments: getEnvironments,
  cleanEntries: cleanEntries,
  write: write,
  startupQuestions: startupQuestions,
  getDateTime: getDateTime,
  getOrgUsers: getOrgUsers,
  getOrgRoles: getOrgRoles,
  getMappedUsers: getMappedUsers,
  getMappedRoles: getMappedRoles,
  cleanOrgUsers: cleanOrgUsers,
  determineUserOrgRole: determineUserOrgRole,
  getOrganizationsWhereUserIsAdmin: getOrganizationsWhereUserIsAdmin,
  kebabize: kebabize,
  flatten: flatten,
}	