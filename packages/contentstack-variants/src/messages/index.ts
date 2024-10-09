import memoize from 'lodash/memoize';

const errors = {
  CREATE_FAILURE: '{module} creation failed!',
};

const commonMsg = {
  CREATE_SUCCESS: '{module} created successfully!',
};

const migrationMsg = {
  IMPORT_MSG: 'Migrating {module}...',
};

const variantEntry = {
  IMPORT_ENTRY_NOT_FOUND: 'Entries data not found to import variant entries',
  EMPTY_VARIANT_UID_DATA: 'Empty variants entry mapper found!',
  VARIANT_ID_NOT_FOUND: 'Variant ID not found',
  VARIANT_UID_NOT_FOUND: 'Entry Variant UID not found',
};

const expImportMsg = {
  UPDATING_CT_IN_EXP: 'Updating content types in experiences...',
  UPDATED_CT_IN_EXP: 'Successfully updated content types in experiences!',
  VALIDATE_VARIANT_AND_VARIANT_GRP: 'Validating variant group and variants creation...',
  PERSONALIZE_JOB_FAILURE: 'Something went wrong! Failed to fetch some variant and variant groups.',
};

const messages: typeof errors & typeof commonMsg & typeof migrationMsg & typeof variantEntry & typeof expImportMsg = {
  ...errors,
  ...commonMsg,
  ...migrationMsg,
  ...variantEntry,
  ...expImportMsg
};

/**
 * The function `` is a TypeScript function that replaces placeholders in a message string with
 * values from a provided object.
 * @param {string} msg - The `msg` parameter is a string that represents the message template with
 * placeholders for dynamic values.
 * @param args - The `args` parameter is an object that contains key-value pairs where the key is a
 * string and the value is also a string. These key-value pairs are used to replace placeholders in the
 * `msg` string with the corresponding values.
 * @returns the formatted message with the provided arguments replaced in the placeholders.
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
export { $t, errors, commonMsg };
