const errors = {};

const commonMsg = {
  CONFIG: 'Path of the external config',
  DATA_DIR: 'Path where the data is stored',
  FIX_CONFIRMATION: 'Would you like to overwrite existing file.?',
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
  AUDIT_CMD_DESCRIPTION: 'Perform audits and find possible errors in the exported Contentstack data',
};

const auditFixMsg = {
  COPY_DATA: 'Create backup from the original data.',
  BKP_PATH: 'Provide the path to backup the copied data',
  FIXED_CONTENT_PATH_MAG: 'You can locate the fixed content at {path}.',
  EMPTY_FIX_MSG: 'Successfully removed the empty field/block found at {path} from the schema.',
  AUDIT_FIX_CMD_DESCRIPTION: 'Perform audits and fix possible errors in the exported Contentstack data.',
};

const messages: typeof errors & typeof commonMsg & typeof auditMsg & typeof auditFixMsg = {
  ...errors,
  ...commonMsg,
  ...auditMsg,
  ...auditFixMsg,
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
  if (!msg) return '';

  for (const key of Object.keys(args)) {
    msg = msg.replace(new RegExp(`{${key}}`, 'g'), args[key]);
  }

  return msg;
}

export default messages;
export { $t, errors, commonMsg, auditMsg, auditFixMsg };
