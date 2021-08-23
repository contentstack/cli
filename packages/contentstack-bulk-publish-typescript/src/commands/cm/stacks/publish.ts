import {Command, flags} from '@contentstack/cli-command'
import { interactive } from '../../../utils';
import config from '../../../config';
import commandNames from '../../../config/commands';
import { ContentStackManagementClient } from '../../../interfaces';

import { start as publishEntries } from '../../../producer/publish-entries';

export default class Publish extends Command {
  private readonly parse: Function;
  private readonly exit: Function;
  private readonly error: Function;
  private readonly region: any;
  managementAPIClient: ContentStackManagementClient
  static description = 'describe the command here'

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    name: flags.string({char: 'n', description: 'name to print'}),
    // flag with no value (-f, --force)
    force: flags.boolean({char: 'f'}),
    option: flags.string({char: 'o', options: config.commands})
  }

  static args = [{name: 'file'}]

  async run(): void {
    let {args, flags} = this.parse(Publish)
    if (!flags)
      flags = {}
    const selectedCommand = await interactive.chooseCommand()
    const stack = await this.authenticateAndGetStack()
    const configConfirmation = await interactive.confirm({ messageCode: 'CLI_BP_CONFIG_CONFIRMATION' })
    if (configConfirmation)
      flags.config = await interactive.askInput({ messageCode: 'CLI_BP_CONFIG' })
    const updatedFlags = await interactive.getMissingFlags(selectedCommand, flags, stack)
    debugger
    await this.execute(selectedCommand, updatedFlags, stack)
    // const updatedFlags = await interactive.getMissingFlags(flags)
    // this.log(`hello ${selectedCommand} from /home/abhinav/Documents/contentstack/cli/packages/contentstack-bulk-publish-typescript/src/commands/publish.ts`)
    // if (args.file && flags.force) {
    //   this.log(`you input --force and --file: ${args.file}`)
    // }
  }

  async authenticateAndGetStack(): void {
    const authenticationMethod = await interactive.askAuthenticationMethod()
    if (authenticationMethod === 'auth-token') {
      this.managementAPIClient = {authtoken: this.authToken}
      const organizationUid = await interactive.askOrganization(this.managementAPIClient)
      const stackApiKey = await interactive.askStack(this.managementAPIClient, organizationUid)
      return this.managementAPIClient.stack({ api_key: stackApiKey})
    }
    const alias = await interactive.askTokenAlias()
    return this.managementAPIClient.stack({ api_key: alias.apiKey, management_token: alias.token })
  }

  async execute(key, updatedFlags, stack): void {
    const config = {
      alias: updatedFlags.alias,
      host: this.region.cma,
    }
    switch(key) {
      case commandNames.ENTRIES: await publishEntries(updatedFlags, stack, config); break;
      case commandNames.ASSETS:
      case commandNames.CLEAR:
      case commandNames.ADD_FIELDS:
      case commandNames.ENTRY_EDITS:
      case commandNames.NONLOCALIZED_FIELD_CHANGES:
      case commandNames.UNPUBLISH:
      case commandNames.UNPUBLISHED_ENTRIES:
      case commandNames.REVERT:
      case commandNames.ADD_FIELDS:
    }
  }
}
