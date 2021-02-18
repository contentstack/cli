const inquirer = require('inquirer')
const config = require('../src/util/config.js')

module.exports = function(ecsv) {
	return new Promise(async resolve => {
		debugger
		let organizations = await getOrganizations(ecsv)
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

function getOrganizations(ecsv) {
	return new Promise(resolve => {
		let result = {}
  	ecsv.managementAPIClient.organization().fetchAll().then(organizations => {
  		debugger
  		organizations.items.forEach(org => {
	  		result[org.name] = org.uid
	  	})
	  	resolve(result)
  	})
	})
}