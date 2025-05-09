import memoize from 'lodash/memoize';

const errors = {};

const tableColumnDescriptions = {
  TABLE_COLUMNS: 'Show only the specified columns (comma-separated)',
  TABLE_SORT: "Property to sort by (prepend '-' for descending)",
  TABLE_CSV: 'The output is in the CSV format [alias: --output=csv]',
  TABLE_FILTER: 'Filter property by partial string matching. For example: name=foo',
  'TABLE_NO-TRUNCATE': 'The output is not truncated to fit the screen',
};

const commonMsg = {
  CONFIG: 'Path of the external config',
  DATA_DIR: 'Path where the data is stored',
  FIX_CONFIRMATION: 'Would you like to overwrite existing file.?',
  WORKFLOW_FIX_WARN: `The workflow associated with UID {uid} and name {name} will be removed.`,
  WORKFLOW_FIX_CONFIRMATION: 'Would you like to overwrite existing file?',
  EXTENSION_FIX_WARN: `The extension associated with UID {uid} and title '{title}' will be removed.`,
  EXTENSION_FIX_CONFIRMATION: `Would you like to overwrite existing file?`,
  WF_BRANCH_REMOVAL: `Removing the branch '{branch} from workflow with UID {uid} and name {name} will be removed.'`,
  CR_BRANCH_REMOVAL: `Removing the branch '{branch} from custom role with UID {uid} and name {name} will be removed.'`,
  SHOW_CONSOLE_OUTPUT: `Display the audit and audit fix result for individual modules`,
};

const auditMsg = {
  REPORT_PATH: 'Path to store the audit reports',
  MODULES: 'Provide the list of modules to be audited',
  AUDIT_START_SPINNER: '{module} scanning...',
  PREPARING_ENTRY_METADATA: 'Creating entry metadata...',
  REFERENCE_ONLY: 'Checks only for missing references.',
  NOT_VALID_PATH: "Provided path '{path}' is not valid.",
  NO_MISSING_REF_FOUND: 'No missing references found.',
  FINAL_REPORT_PATH: "Reports ready. Please find the reports at '{path}'.",
  SCAN_CT_SUCCESS_MSG: "Successfully completed the scanning of {module} '{title}'.",
  SCAN_ENTRY_SUCCESS_MSG: "Successfully completed the scanning of {module} ({local}) '{title}'.",
  SCAN_EXT_SUCCESS_MSG: "Successfully completed scanning the {module} titled '{title}' with UID '{uid}'",
  AUDIT_CMD_DESCRIPTION: 'Perform audits and find possible errors in the exported Contentstack data',
  SCAN_WF_SUCCESS_MSG: 'Successfully completed the scanning of workflow with UID {uid} and name {name}.',
  SCAN_CR_SUCCESS_MSG: 'Successfully completed the scanning of custom role with UID {uid} and name {name}.',
  SCAN_ASSET_SUCCESS_MSG: `Successfully completed the scanning of Asset with UID '{uid}'.`,
  SCAN_ASSET_WARN_MSG: `The locale '{locale}' or environment '{environment}' are not present for asset with uid '{uid}'`,
  ENTRY_PUBLISH_DETAILS: `Removing the publish detials for entry '{uid}' of ct '{ctuid}' in locale '{locale}' as locale '{publocale}' or environment '{environment}' does not exist`,
  CT_REFERENCE_FIELD: `The mentioned Reference field is not Array field reference is '{reference_to}' having display name '{display_name}''`,
  ASSET_NOT_EXIST: `The publish_details either does not exist or is not an array for asset uid '{uid}'`,
  ENTRY_PUBLISH_DETAILS_NOT_EXIST: `The publish_details either does not exist or is not an array for entry uid '{uid}'`,
  FIELD_RULE_CONDITION_ABSENT: `The operand field '{condition_field}' is not present in the schema of the content-type {ctUid}`,
  FIELD_RULE_TARGET_ABSENT: `The target field '{target_field}' is not present in the schema of the content-type {ctUid}`,
  FIELD_RULE_CONDITION_SCAN_MESSAGE: `Completed Scanning of Field Rule '{num}' condition of Content-type '{ctUid}'`,
  FIELD_RULE_TARGET_SCAN_MESSAGE: `Completed Scanning of Field Rule '{num}' target of Content-type '{ctUid}'`
};

const auditFixMsg = {
  COPY_DATA: 'Create backup from the original data.',
  BKP_PATH: 'Provide the path to backup the copied data',
  FIX_OPTIONS: 'Provide the list of fix options',
  FIXED_CONTENT_PATH_MAG: 'You can locate the fixed content at {path}.',
  EMPTY_FIX_MSG: 'Successfully removed the empty field/block found at {path} from the schema.',
  AUDIT_FIX_CMD_DESCRIPTION: 'Perform audits and fix possible errors in the exported Contentstack data.',
  WF_FIX_MSG: 'Successfully removed the workflow {uid} named {name}.',
  ENTRY_MANDATORY_FIELD_FIX: `Removing the publish details from the entry with UID '{uid}' in Locale '{locale}'...`,
  ENTRY_SELECT_FIELD_FIX: `Adding the value '{value}' in the select field of entry UID '{uid}'...`,
  ASSET_FIX: `Fixed publish detials for Asset with UID '{uid}'`,
  FIELD_RULE_FIX_MESSAGE: `Fixed Field Rule '{num}' target of Content-type '{ctUid}`,
};

const messages: typeof errors &
  typeof commonMsg &
  typeof auditMsg &
  typeof auditFixMsg &
  typeof tableColumnDescriptions = {
  ...errors,
  ...commonMsg,
  ...auditMsg,
  ...auditFixMsg,
  ...tableColumnDescriptions,
};

/**
 * The function `$t` is a TypeScript function that replaces placeholders in a string with corresponding
 * values from an object.
 * @param {string} msg - The `msg` parameter is a string that represents a message or a template with
 * placeholders. These placeholders are enclosed in curly braces, such as `{key}`.
 * @param args - The `args` parameter is an object that contains key-value pairs. The keys represent
 * placeholders in the `msg` string, and the values are the replacements for those placeholders.
 * @returns a string.
 */
function $t(msg: string, args: Record<string, string>): string {
  const transfer = memoize(function (msg: string, args: Record<string, string>) {
    if (!msg) return '';

    for (const key of Object.keys(args)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const placeholder = `{${escapedKey}}`;
      msg = msg.split(placeholder).join(args[key]);
    }

    return msg;
  });

  return transfer(msg, args);
}

export default messages;
export { $t, errors, commonMsg, auditMsg, auditFixMsg, tableColumnDescriptions };
