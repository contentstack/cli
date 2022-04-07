import cliux from './cli-ux';

/**
 * checks the deprecation and prints it
 * @param {Array} deprecatedFlags flags to be deprecated
 * @param {String} customMessage [optional] a custom message
 * @returns flag parser
 */
export default function (deprecatedFlags = [], customMessage: string) {
  return (input, command) => {
    let isCommandHasDeprecationFlag = false;
    deprecatedFlags.forEach((item) => {
      if (command.argv.indexOf(item) !== -1) {
        isCommandHasDeprecationFlag = true;
        return;
      }
    });

    if (isCommandHasDeprecationFlag) {
      cliux.print(
        `DEPRECATION WARNING: ${
          customMessage ? customMessage : `flags ${deprecatedFlags.join(',')} will be removed in 2 months`
        }`,
        {
          color: 'yellow',
        },
      );
    }

    return input;
  };
}
