import cliux from './cli-ux';

/**
 * checks the deprecation and prints it
 * @param {Array} deprecatedFlags flags to be deprecated
 * @param {String} customMessage [optional] a custom message
 * @returns flag parser
 */
export default function (deprecatedFlags = [], suggestions = [], customMessage?: string) {
  return (input, command) => {
    const { context: { flagWarningPrintState = {} } = {} } = command
    let isCommandHasDeprecationFlag = false;
    deprecatedFlags.forEach((item) => {
      if (command.argv.indexOf(item) !== -1) {
        if (flagWarningPrintState[command.id + item]) {
          return input
        }
        flagWarningPrintState[command.id + item] = true
        isCommandHasDeprecationFlag = true;
      }
    });

    if (isCommandHasDeprecationFlag) {
      let depreactionMessage = '';
      if (customMessage) {
        depreactionMessage = customMessage;
      } else {
        depreactionMessage = `WARNING!!! You're using the old (soon to be deprecated) Contentstack CLI flags (${deprecatedFlags.join(
          ', ',
        )}).`;

        if (suggestions.length > 0) {
          depreactionMessage += ` We recommend you to use the updated flags (${suggestions.join(', ')}).`;
        }
      }
      cliux.print(depreactionMessage, { color: 'yellow' });
    }

    return input;
  };
}
