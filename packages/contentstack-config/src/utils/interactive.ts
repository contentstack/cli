import { cliux } from '@contentstack/cli-utilities';

export const askRegions = async (): Promise<string> => {
  return cliux.inquire<string>({
    type: 'list',
    name: 'selectedRegion',
    message: 'CLI_CONFIG_SELECT_REGION',
    choices: [
      { name: 'NA', value: 'NA' },
      { name: 'EU', value: 'EU' },
      { name: 'AZURE-NA', value: 'AZURE-NA' },
      { name: 'AZURE-EU', value: 'AZURE-EU' },
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

  const uiHost = await cliux.inquire<string>({
    type: 'input',
    name: 'ui-host',
    message: 'CLI_CONFIG_INQUIRE_REGION_UI_HOST',
  });

  return { name, cma, cda, uiHost };
};
