import { cliux, messageHandler } from '@contentstack/cli-utilities';

export const askRegions = async (): Promise<string> => {
  return cliux.inquire<string>({
    type: 'list',
    name: 'selectedRegion',
    message: 'CLI_CONFIG_SELECT_REGION',
    choices: [
      { name: 'AWS-NA', value: 'AWS-NA' },
      { name: 'AWS-EU', value: 'AWS-EU' },
      { name: 'AWS-AU', value: 'AWS-AU' },
      { name: 'AZURE-NA', value: 'AZURE-NA' },
      { name: 'AZURE-EU', value: 'AZURE-EU' },
      { name: 'GCP-NA', value: 'GCP-NA' },
      { name: 'GCP-EU', value: 'GCP-EU' },
      { name: 'Custom', value: 'custom' },
      { name: 'Exit', value: 'exit' },
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

  const uiHost = await cliux.inquire<string>({
    type: 'input',
    name: 'ui-host',
    message: 'CLI_CONFIG_INQUIRE_REGION_UI_HOST',
  });

  return { name, cma, cda, uiHost };
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

export function inquireRequireFieldValidation(input: string): string | boolean {
  if (!input || input.trim() === '') {
    return messageHandler.parse('CLI_BRANCH_REQUIRED_FIELD');
  }
  return true;
}

export async function askEarlyAccessHeaderValue(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_CONFIG_INQUIRE_EARLY_ACCESS_HEADER_VALUE',
    name: 'header-value',
    validate: inquireRequireFieldValidation,
  });
}

export async function askEarlyAccessHeaderAlias(): Promise<string> {
  return await cliux.inquire<string>({
    type: 'input',
    message: 'CLI_CONFIG_INQUIRE_EARLY_ACCESS_HEADER_ALIAS',
    name: 'header-alias',
    validate: inquireRequireFieldValidation,
  });
}

export const askOrgID = async (): Promise<string> => {
  return cliux.inquire<string>({
    type: 'input',
    message: 'Provide the organization UID',
    name: 'org',
  });
};

export async function askLogLevel(): Promise<string> {
  const { logLevel }: { logLevel: string } = await cliux.inquire([
    {
      type: 'list',
      name: 'logLevel',
      message: 'Select log level:',
      choices: ['debug', 'info', 'warn', 'error'],
    },
  ]);
  return logLevel;
}

export async function askLogPath(): Promise<string> {
  const { logPath }: { logPath: string } = await cliux.inquire([
    {
      type: 'input',
      name: 'logPath',
      message: 'Enter log file path:',
    },
  ]);
  return logPath;
}

export async function promptForMFASecret(): Promise<string> {
  const secret = await cliux.inquire<string>({
    type: 'password',
    name: 'secret',
    message: 'Enter your secret:',
    validate: (input: string) => {
      if (!input) {
        cliux.error('Secret is required');
        process.exit(1);
      }
      return true;
    },
  });

  return secret;
}

export async function confirmMFAOverwrite(): Promise<boolean> {
  return cliux.inquire<boolean>({
    type: 'confirm',
    name: 'confirm',
    message: 'A secret configuration already exists. Do you want to overwrite it?',
  });
}

export async function confirmMFARemoval(): Promise<boolean> {
  const message = 'Are you sure you want to remove the stored secret?';
  return cliux.inquire<boolean>({
    type: 'confirm',
    name: 'confirm',
    message,
  });
}
