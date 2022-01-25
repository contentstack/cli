import {Command, flags} from '@contentstack/cli-command'
import { interactive } from '../../../utils';
import config from '../../../config';
import commandNames from '../../../config/commands';
import { ContentStackManagementClient } from '../../../interfaces';

import { 
  addFields,
  crossPublish,
  nonLocalizedFieldChanges,
  publishAssets,
  publishEdits,
  publishEntries,
  publishUnpublishedEnv,
  revert,
  unpublish,
 } from '../../../producer';

// import { 
//   publishEntries,
//  } from '../../../producer';


export default class Publish extends Command {
  private readonly parse: Function;
  private readonly exit: Function;
  private readonly error: Function;
  private readonly region: any;
  private readonly authToken: string;
  managementAPIClient: ContentStackManagementClient
  static description = 'describe the command here'

  static flags = {
    help: flags.help({char: 'h'}),
  }

  async run(): Promise<void> {
    let {args, flags} = this.parse(Publish)
    if (!flags)
      flags = {}
    const selectedCommand = await interactive.chooseCommand()
    const stack = await this.authenticateAndGetStack()
    const configConfirmation = await interactive.confirm({ messageCode: 'CLI_BP_CONFIG_CONFIRMATION' })
    if (configConfirmation)
      flags.config = await interactive.askInput({ messageCode: 'CLI_BP_CONFIG' })
    const updatedFlags = await interactive.getMissingFlags(selectedCommand, flags, stack)
    await this.execute(selectedCommand, updatedFlags, stack)
    // const updatedFlags = await interactive.getMissingFlags(flags)
    // this.log(`hello ${selectedCommand} from /home/abhinav/Documents/contentstack/cli/packages/contentstack-bulk-publish-typescript/src/commands/publish.ts`)
    // if (args.file && flags.force) {
    //   this.log(`you input --force and --file: ${args.file}`)
    // }
  }

  async authenticateAndGetStack(): Promise<void> {
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

  async execute(key, updatedFlags, stack): Promise<void> {
    const config = {
      alias: updatedFlags.alias,
      host: this.region.cma,
    }
    switch(key) {
      case commandNames.ADD_FIELDS: await addFields(updatedFlags, stack, config); break;
      case commandNames.CROSS_PUBLISH: await crossPublish(updatedFlags, stack, config); break;
      case commandNames.NONLOCALIZED_FIELD_CHANGES: await nonLocalizedFieldChanges(updatedFlags, stack, config); break;
      case commandNames.ASSETS: await publishAssets(updatedFlags, stack, config); break;
      case commandNames.ENTRY_EDITS: await publishEdits(updatedFlags, stack, config); break;
      case commandNames.ENTRIES: await publishEntries(updatedFlags, stack, config); break;
      case commandNames.UNPUBLISH: await unpublish(updatedFlags, stack, config); break;
      case commandNames.UNPUBLISHED_ENTRIES: await publishUnpublishedEntries(updatedFlags, stack, config); break;
    }
  }
}
