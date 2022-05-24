declare module '@contentstack/cli-utilities' {
  // import { printFlagDeprecation } from '@contentstack/cli-utilities';

  // export { printFlagDeprecation };

  import {
    CliUx,
    cliux,
    logger,
    CLIError,
    configHandler,
    messageHandler,
    printFlagDeprecation,

    // NOTE @oclif/core cli-ux
    ux,
    Table,
    Config,
    config,
    ExitError,
    ActionBase,
    IPromptOptions,
  } from '@contentstack/cli-utilities/types'
  
  export {
    CliUx,
    cliux,
    logger,
    CLIError,
    configHandler,
    messageHandler,
    printFlagDeprecation,

    // NOTE @oclif/core cli-ux
    ux,
    Table,
    Config,
    config,
    ExitError,
    ActionBase,
    IPromptOptions,
  }
}
