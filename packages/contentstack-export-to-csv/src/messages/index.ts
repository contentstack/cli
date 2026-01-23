/**
 * Messages and strings used in the export-to-csv command.
 */

export const messages = {
  // Command description
  COMMAND_DESCRIPTION: 'Export entries, taxonomies, terms, or organization users to CSV using this command',

  // Flag descriptions
  FLAG_ACTION: 'Option to export data (entries, users, teams, taxonomies). <options: entries|users|teams|taxonomies>',
  FLAG_ALIAS: 'Alias of the management token',
  FLAG_ORG: 'Provide organization UID to clone org users',
  FLAG_STACK_NAME: 'Name of the stack that needs to be created as CSV filename',
  FLAG_STACK_API_KEY: 'Provide the stack API key of the source stack',
  FLAG_ORG_NAME: 'Name of the organization that needs to be created as CSV filename',
  FLAG_LOCALE: 'Locale of entries that will be exported',
  FLAG_CONTENT_TYPE: 'Content type of entries that will be exported',
  FLAG_BRANCH: 'Branch from which entries will be exported',
  FLAG_TEAM_UID: 'Provide the UID of a specific team in an organization',
  FLAG_TAXONOMY_UID: 'Provide the taxonomy UID of the related terms you want to export',
  FLAG_INCLUDE_FALLBACK:
    "[Optional] Include fallback locale data when exporting taxonomies. When enabled, if a taxonomy term doesn't exist in the specified locale, it will fallback to the hierarchy defined in the branch settings.",
  FLAG_FALLBACK_LOCALE:
    "[Optional] Specify a specific fallback locale for taxonomy export. This locale will be used when a taxonomy term doesn't exist in the primary locale. Takes priority over branch fallback hierarchy when both are specified.",
  FLAG_DELIMITER:
    "[Optional] Provide a delimiter to separate individual data fields within the CSV file. For example: cm:export-to-csv --delimiter '|'",

  // Action choices for interactive prompts
  ACTION_EXPORT_ENTRIES: 'Export entries to a .CSV file',
  ACTION_EXPORT_USERS: "Export organization users' data to a .CSV file",
  ACTION_EXPORT_TEAMS: "Export organization teams' data to a .CSV file",
  ACTION_EXPORT_TAXONOMIES: 'Export taxonomies to a .CSV file',
  ACTION_CANCEL: 'Cancel and Exit',

  // Error messages
  ERROR_NOT_LOGGED_IN: 'You need to either login or provide a management token to execute this command',
  ERROR_LOGIN_REQUIRED: 'You need to login to execute this command. See: auth:login --help',
  ERROR_API_FAILED: 'Something went wrong! Please try again',
  ERROR_CONTENT_TYPE_NOT_FOUND: 'The Content Type {contentType} was not found. Please try again.',
  ERROR_NO_CONTENT_TYPES: 'No content types found for the given stack',
  ERROR_SELECT_CONTENT_TYPE: 'Please select at least one content type',
  ERROR_ORG_NOT_FOUND: 'Org UID not found',
  ERROR_MANAGEMENT_TOKEN_NOT_FOUND: 'The provided management token alias was not found in your config',
  ERROR_MANAGEMENT_TOKEN_INVALID: 'Management token or stack API key is invalid',
  ERROR_ADMIN_ACCESS_DENIED: "Unable to export data. Make sure you're an admin or owner of this organization",

  // Info messages
  INFO_NO_TAXONOMIES: 'No taxonomies found!',
  INFO_WRITING_FILE: 'Writing {type} to file: "{path}"',
  INFO_EXPORTING_TEAMS: 'Exporting the teams of Organisation {orgName}',
  INFO_EXPORTING_TEAM: 'Exporting the team with uid {teamUid} in Organisation {orgName}',
  INFO_EXPORTING_TEAM_USERS: 'Exporting the teams user data for {target}',
  INFO_EXPORTING_STACK_ROLES: 'Exporting the stack role details for {target}',
  INFO_NO_TEAMS:
    'The organization {orgName} does not have any teams associated with it. Please verify and provide the correct organization name.',

  // Warning messages
  WARNING_STACK_ACCESS_DENIED:
    'Admin access denied to the following stacks using the provided API keys. Please get in touch with the stack owner to request access.',

  // Prompt messages
  PROMPT_CHOOSE_ACTION: 'Choose Action',
  PROMPT_CHOOSE_ORG: 'Choose an Organization',
  PROMPT_CHOOSE_STACK: 'Choose a Stack',
  PROMPT_CHOOSE_BRANCH: 'Choose a Branch',
  PROMPT_CHOOSE_CONTENT_TYPE: 'Choose Content Type (Press Space to select the content types)',
  PROMPT_CHOOSE_LANGUAGE: 'Choose Language',
  PROMPT_CONTINUE_EXPORT:
    'Access denied: Please confirm if you still want to continue exporting the data without the { Stack Name, Stack Uid, Role Name } fields.',
} as const;

/**
 * Template string replacer utility.
 * @param message - Message with placeholders like {key}
 * @param params - Object with key-value pairs to replace
 */
export function formatMessage(message: string, params: Record<string, string>): string {
  let result = message;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}
