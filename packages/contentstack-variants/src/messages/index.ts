import memoize from 'lodash/memoize';

const errors = {
  CREATE_FAILURE: '${module} created failed!',
};

const commonMsg = {
  CREATE_SUCCESS: '${module} created successfully!',
};

const migrationMsg = {
  IMPORT_MSG: 'Migrating ${module}...',
};

const messages: typeof errors & typeof commonMsg & typeof migrationMsg = {
  ...errors,
  ...commonMsg,
  ...migrationMsg
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
      msg = msg.replace(new RegExp(`{${escapedKey}}`, 'g'), args[key] || escapedKey);
    }

    return msg;
  });

  return transfer(msg, args);
}

export default messages;
export { $t, errors, commonMsg };
