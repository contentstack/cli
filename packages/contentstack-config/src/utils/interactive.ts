import { isEmpty } from 'lodash';
import { cliux, messageHandler } from '@contentstack/cli-utilities';

export const askRegions = async (): Promise<string> => {
  return cliux.inquire<string>({
    type: 'list',
    name: 'selectedRegion',
    message: 'CLI_CONFIG_SELECT_REGION',
    choices: [
      { name: 'NA', value: 'NA' },
      { name: 'EU', value: 'EU' },
      { name: 'AZURE-NA', value: 'AZURE-NA' },
      { name: 'Custom', value: 'custom' },
      { name: 'exit', value: 'exit' },
    ],
  });
};

export const askCustomRegion = async (): Promise<any> => {
  const name = await cliux.inquire<string>({
    type: 'input',
    name: 'name',
    message: 'CLI_CONFIG_INQUIRE_REGION_NAME',
  });

  const cma = await cliux.inquire<string>({
    type: 'input',
    name: 'cma',
    message: 'CLI_CONFIG_INQUIRE_REGION_CMA',
  });

  const cda = await cliux.inquire<string>({
    type: 'input',
    name: 'cda',
    message: 'CLI_CONFIG_INQUIRE_REGION_CDA',
  });

  return { name, cma, cda };
};

export async function askStackAPIKey(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_CONFIG_INQUIRE_API_KEY',
    name: 'stack-api-key',
    validate: inquireRequireFieldValidation,
  });
}

export async function askBaseBranch(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_CONFIG_INQUIRE_BASE_BRANCH',
    name: 'base-branch',
    validate: inquireRequireFieldValidation,
  });
}

export async function askConfirmation(): Promise<boolean> {
  return await cliux.inquire<boolean>({
    type: 'confirm',
    message: 'Are you sure you want to remove this configuration ?',
    name: 'config_remove_confirmation',
  });
}

export function inquireRequireFieldValidation(input: any): string | boolean {
  if (isEmpty(input)) {
    return messageHandler.parse('CLI_BRANCH_REQUIRED_FIELD');
  }
  return true;
}
