const errors = {
  NOT_EMPTY: '{value} cannot be empty.',
};

const commonMsg = {
  CONFIG: 'Path of the external config.',
  CURRENT_WORKING_DIR: 'Current working directory.',
  DATA_DIR: 'Path where the data is stored.',
};

const auditMsg = {
  REPORT_PATH: 'Path to store the audit reports.',
  MODULES: 'Provide the list of modules to be audited.',
  AUDIT_START_SPINNER: '{module} scanning...',
  PREPARING_ENTRY_METADATA: 'Creating entry metadata...',
  REFERENCE_ONLY: 'Checks only for missing references.',
  NOT_VALID_PATH: "Provided path '{path}' is not valid.",
  NO_MISSING_REF_FOUND: 'No missing references found.',
  FINAL_REPORT_PATH: "Reports ready. Please find the reports at '{path}'.",
  SCAN_CT_SUCCESS_MSG: "Successfully completed the scanning of {module} '{title}'.",
  SCAN_ENTRY_SUCCESS_MSG: "Successfully completed the scanning of {module} ({local}) '{title}'.",
};

const messages: typeof errors & typeof commonMsg & typeof auditMsg = {
  ...errors,
  ...commonMsg,
  ...auditMsg,
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
export { $t, errors, commonMsg, auditMsg };
