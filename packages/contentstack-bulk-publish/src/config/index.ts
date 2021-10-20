import constants from './constants'
import commandNames from './commands'

const commands = {}
commands[commandNames.ENTRIES] = {
	configKey: 'publish_entries',
	flags: [
		constants.RETRY_FAILED_CONFIRMATION,
		constants.RETRY_FAILED,
		constants.ALIAS,
		constants.PUBLISH_ALL_CONTENT_TYPES,
		constants.CONTENT_TYPES,
		constants.BULK_PUBLISH,
		constants.LOCALES,
		constants.ENVIRONMENTS,
		constants.CONFIG,
		constants.SKIP_WORKFLOW_STAGE_CHECK,
	],
}
commands[commandNames.ASSETS] = {
	configKey: 'publish_assets',
	flags: [
		constants.RETRY_FAILED_CONFIRMATION,
		constants.RETRY_FAILED,
		constants.ALIAS,
		constants.ENVIRONMENTS,
		constants.FOLDER_UID,
		constants.BULK_PUBLISH,
		constants.CONFIG,
		constants.LOCALES,
		constants.SKIP_WORKFLOW_STAGE_CHECK,
	],
}
commands[commandNames.CLEAR] = {}
commands[commandNames.CONFIGURE] = {}
commands[commandNames.CROSS_PUBLISH] = {
	configKey: 'cross_env_publish',
	flags: [
		constants.RETRY_FAILED_CONFIRMATION,
		constants.RETRY_FAILED,
		constants.ALIAS,
		constants.BULK_PUBLISH,
		constants.CONTENT_TYPE,
		constants.LOCALE,
		constants.ENVIRONMENT,
		constants.DELIVERY_TOKEN,
		constants.DESTINATION_ENVIRONMENT,
		constants.CONFIG,
		constants.SKIP_WORKFLOW_STAGE_CHECK,
	],
}
commands[commandNames.ENTRY_EDITS] = {
	configKey: 'publish_edits_on_env',
	flags: [
		constants.RETRY_FAILED_CONFIRMATION,
		constants.RETRY_FAILED,
		constants.ALIAS,
		constants.BULK_PUBLISH,
		constants.ENVIRONMENT,
		constants.CONTENT_TYPES,
		constants.LOCALES,
		constants.ENVIRONMENTS,
		constants.CONFIG,
		constants.SKIP_WORKFLOW_STAGE_CHECK,
	],
}
commands[commandNames.NONLOCALIZED_FIELD_CHANGES] = {
	configKey: 'nonlocalized_field_changes',
	flags: [
		constants.RETRY_FAILED_CONFIRMATION,
		constants.RETRY_FAILED,
		constants.ALIAS,
		constants.BULK_PUBLISH,
		constants.ENVIRONMENT,
		constants.CONTENT_TYPES,
		constants.ENVIRONMENTS,
		constants.CONFIG,
		constants.SKIP_WORKFLOW_STAGE_CHECK,
	],
}
commands[commandNames.REVERT] = {
	configKey: 'revert',
	flags: [
		constants.RETRY_FAILED,
		constants.LOG_FILE
	],
}
commands[commandNames.UNPUBLISH] = {
	configKey: 'Unpublish',
	flags: [
		constants.RETRY_FAILED_CONFIRMATION,
		constants.RETRY_FAILED,
		constants.ALIAS,
		constants.BULK_UNPUBLISH,
		constants.CONTENT_TYPE,
		constants.LOCALE,
		constants.ENVIRONMENT,
		constants.DELIVERY_TOKEN,
		constants.CONFIG,
		constants.ONLY_ASSETS,
		constants.ONLY_ENTRIES,
		constants.SKIP_WORKFLOW_STAGE_CHECK,
	]
}
commands[commandNames.UNPUBLISHED_ENTRIES] = {
	configKey: 'publish_unpublished_env',
	flags: [
		constants.RETRY_FAILED_CONFIRMATION,
		constants.RETRY_FAILED,
		constants.ALIAS,
		constants.BULK_PUBLISH,
		constants.ENVIRONMENT,
		constants.CONTENT_TYPES,
		constants.LOCALE,
		constants.ENVIRONMENTS,
		constants.CONFIG,
		constants.SKIP_WORKFLOW_STAGE_CHECK,
	]
}
commands[commandNames.ADD_FIELDS] = {
	configKey: 'add_fields',
	flags: [
		constants.RETRY_FAILED_CONFIRMATION,
		constants.RETRY_FAILED,
		constants.ALIAS,
		constants.BULK_PUBLISH,
		constants.CONTENT_TYPES,
		constants.LOCALES,
		constants.ENVIRONMENTS,
		constants.CONFIG,
		constants.SKIP_WORKFLOW_STAGE_CHECK,
		constants.SKIP_PUBLISH
	]
}

export default {
	logger: {
		level: 'error',
		silent: true,
	},
	commands: commands
}

