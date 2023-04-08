import { cliux, configHandler } from '@contentstack/cli-utilities';

export async function removeConfig(apiKey) {
  await configHandler.set(`baseBranch.${apiKey}`, 'main');
  cliux.success(`base branch : ${configHandler.get(`baseBranch.${apiKey}`)}`);
  cliux.success(`stack-api-key: ${apiKey}`);
  cliux.success(`Base branch configuration for stack-api-key: ${apiKey} has been removed successfully`);
}
