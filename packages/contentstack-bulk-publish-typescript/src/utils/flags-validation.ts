import config from '../config'
import commandNames from '../config/commands'
import constants from '../config/constants'
const requiredFlags = {
	'publish_entries': ['contentTypes', 'locales', 'environments', 'alias'],
	
	// currentFlag is the flag that is being processed right now
}

// flags contains the flag data accumulated till now
export function validate(command, currentFlag, flags): any {
	let flag = true
	switch(command) {
		case commandNames.ENTRIES: {
			if (flags[constants.RETRY_FAILED] && flags[constants.RETRY_FAILED].length > 0)
				flag = false
			if (flags[constants.PUBLISH_ALL_CONTENT_TYPES] && currentFlag === constants.CONTENT_TYPES)
				flag = false
			if (flags[constants.AUTHENTICATION_METHOD] === 'management-token'
				&& currentFlag === constants.ORGANIZATION
				|| currentFlag === constants.STACK
			)
				flag = false
			if (!flags[constants.RETRY_FAILED_CONFIRMATION] && currentFlag === constants.RETRY_FAILED)
				flag = false
		}	
		case commandNames.ASSETS: {}
		case commandNames.CLEAR: {}
		case commandNames.CONFIGURE: {}
		case commandNames.CROSS_PUBLISH: {}
		case commandNames.ENTRY_EDITS: {}
		case commandNames.NONLOCALIZED_FIELD_CHANGES: {}
		case commandNames.REVERT: {}
		case commandNames.UNPUBLISH: {}
		case commandNames.UNPUBLISHED_ENTRIES: {}
		case commandNames.ADD_FIELDS: {}
	}
	return flag
}

export function shouldNotBeEmpty(input): boolean | Error {
	if (input.length === 0)
		throw new Error('Please enter a valid value')
	return true
}

// export function validate(key, flags): Error | null {
// 	const missing = []
// 	requiredFlags[key].forEach(element => {
// 		if (!flags[elemment] || flags[element].length === 0)
// 			missing.push(element)
// 	})
// 	if (missing.length > 0)
// 		// instead of throwing an error for missing flags, I need to prompt the user to enter those flags
// 		// doing this will also help me progress on the ticket for making bulk publish plugin interactive
// 		throw Error(`${missing.join(', ')} are required for processing this command. Please check --help for more details`)
// 	switch(key) {
// 		case 'publish_entries': {
// 			if (flags.publishAllContentTypes && flags.contentTypes && flagscontentTypes.length > 0) {
// 	      throw Error('Do not specify contentTypes when publishAllContentTypes flag is set. Please check --help for more details')
// 	    }
// 			break;
// 		}
// 	}
// }

