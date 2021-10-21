import cliux from './cli-ux';
import {selectors} from '@contentstack/cli-utilities'
import config from '../config'
import {store} from '../utils'
import { Token } from '../interfaces';
import constants from '../config/constants';
import { validate, shouldNotBeEmpty } from './flags-validation';

const flagsToIgnore = ['alias', 'yes', 'config']

export const askPassword = async () => {
  return cliux.inquire<string>({
    type: 'input',
    message: 'CLI_AUTH_LOGIN_ENTER_PASSWORD',
    name: 'password',
    transformer: (pswd: string) => {
      let pswdMasked = '';
      for (let i = 0; i < pswd.length; i++) {
        pswdMasked += '*';
      }
      return pswdMasked;
    },
  });
};

export const askOTPChannel = async (): Promise<string> => {
  return cliux.inquire<string>({
    type: 'list',
    name: 'otpChannel',
    message: 'CLI_AUTH_LOGIN_ASK_CHANNEL_FOR_OTP',
    choices: [
      { name: 'Authy App', value: 'authy' },
      { name: 'SMS', value: 'sms' },
    ],
  });
};

export const askOTP = async (): Promise<string> => {
  return cliux.inquire({
    type: 'input',
    message: 'CLI_AUTH_LOGIN_ENTER_SECURITY_CODE',
    name: 'tfaToken',
  });
};

export const askUsername = async (): Promise<string> => {
  return cliux.inquire<string>({
    type: 'input',
    message: 'CLI_AUTH_LOGIN_ENTER_EMAIL_ADDRESS',
    name: 'username',
  });
};

export const confirm = async ({messageCode}): Promise<string> => {
  return cliux.inquire<string>({
    type: 'confirm',
    message: messageCode,
    name: 'confirmation',
  })
}

export const chooseCommand = async (): Promise<string> => {
  const options = Object.keys(config.commands)
  return cliux.inquire({
    type: 'list',
    message: 'CLI_BP_SELECTCOMMAND',
    name: 'command',
    choices: options,
    loop: false,
  })
}

export const askTokenAlias = async (): Promise<Token> => {
  return new Promise(async (resolve, reject) => {
    const token: Token = await selectors.chooseTokenAlias()
    return resolve(token)
  })
}

export const askDeliveryToken = async (): Promise<Token> => {
  return new Promise(async (resolve, reject) => {
    const token: Token = await selectors.chooseDeliveryTokenAlias()
    return resolve(token)
  })
}

export const askContentTypes = async ({stack}): Promise<string[]> => {
  const contentTypes = await selectors.chooseContentTypes(stack)
  return contentTypes.map(ct => ct.uid)
}

export const askContentType = async ({stack}): Promise<string> => {
  const contentType = await selectors.chooseContentType(stack)
  return contentType
}

export const askLocales = async ({stack}): Promise<string[]> => {
  const locales = await selectors.chooseLocales(stack)
  return locales.map(loc => loc.code)
}

export const askLocale = async ({stack}): Promise<string> => {
  const locale = await selectors.chooseLocale(stack)
  return locale
}

export const askEnvironments = async ({stack}): Promise<string[]> => {
  const environments = await selectors.chooseEnvironments(stack)
  return environments.map(env => env.name)
}

export const askEnvironment = async ({ stack }): Promise<string> => {
  const environment = await selectors.chooseEnvironment(stack)
  return environment
}

// export const askAlias = async (): Promise<string> => {

// }

export const askOrganization = async (client): Promise<string> => {
  const organization = await selectors.chooseOrganization(client)
  return organization.orgUid
}

export const askAuthenticationMethod = async (): Promise<string> => {
  const options = ['auth-token', 'management-token']
  return cliux.inquire<string>({
    type: 'list',
    choices: options,
    message: 'Choose an authentication method',
    name: 'authenticationMethod'
  })
}

export const askInput = async ({messageCode, defaultValue}): Promise<string> => {
  const options = {
    type: 'input',
    message: messageCode,
    name: 'something',
    validate: shouldNotBeEmpty,
  }
  if (defaultValue) {
    options['default'] = defaultValue
  }
  return cliux.inquire(options);
}

export const askStack = async (client, orgUid): Promise<string> => {
  const stack = await selectors.chooseStack(client, orgUid)
  return stack.api_key
}

// export const askSkipWorkflowStageUpdate = async (): Promise<string> => {

// }

// export const askBulkPublish = async (): Promise<string> => {

// }

// export const askPublishAllContentTypes = async (): Promise<string> => {

// }

// export const askRetryFailed = async (): Promise<string> => {

// }

// const askFlags = {
//   'contentTypes': { func: askContentTypes, args: {} },
//   'contentType': { func: test, args: {} },
//   'locales': { func: askLocales, args: {} },
//   'locale': { func: test, args: {} },
//   'environments': { func: askEnvironments, args: {} },
//   'environment': { func: test, args: {} },
//   'sourceEnv': { func: test, args: {} },
//   'destEnv': { func: test, args: {} },
//   'alias': { func: askTokenAlias, args: {} },
//   'bulkPublish': { func: confirm, args: {messageCode: 'CLI_BP_BULKPUBLISH'} },
//   'publishAllContentTypes': { func: confirm, args: { messageCode:'CLI_BP_PUBLISH_ALL_CONTENTTYPES'} },
//   'config': { func: test, args: {} },
//   'skip-workflow-stage-check': { func: confirm, args: { messageCode:'CLI_BP_SKIP_WORKFLOW_STAGE_CHECK'} },
//   'query': { func: askQueries, args: {} },
// }

const askFlags = {}

askFlags[constants.ORGANIZATION] = {}
askFlags[constants.STACK] = {}

askFlags[constants.CONTENT_TYPES] = { func: askContentTypes, args: {} }
askFlags[constants.CONTENT_TYPE] = { func: askContentType, args: {} }

askFlags[constants.LOCALES] = { func: askLocales, args: {} }
askFlags[constants.LOCALE] = { func: askLocale, args: {} }

askFlags[constants.ENVIRONMENTS] = { func: askEnvironments, args: {} }
askFlags[constants.ENVIRONMENT] = { func: askEnvironment, args: {} }
askFlags[constants.SOURCE_ENVIRONMENT] = { func: askEnvironment, args: {} }
askFlags[constants.DESTINATION_ENVIRONMENT] = { func: askEnvironment, args: {} }

askFlags[constants.FOLDER_UID] = { func: askInput, args: { messageCode: 'CLI_BP_FOLDER_ID', defaultValue: 'cs_root' } }

// selects a token from already configured tokens
askFlags[constants.ALIAS] = { func: askTokenAlias, args: {} }
askFlags[constants.DELIVERY_TOKEN] = { func: askDeliveryToken, args: {} }
askFlags[constants.AUTHENTICATION_METHOD] = {}

// expects a path to an appropriate file
// need to add validations for the file path
askFlags[constants.CONFIG_CONFIRMATION] = { func: confirm, args: { messageCode: 'CLI_BP_CONFIG_CONFIRMATION' } }
askFlags[constants.RETRY_FAILED_CONFIRMATION] = { func: confirm, args: { messageCode: 'CLI_BP_RETRY_FAILED_CONFIRMATION' } }
// askFlags[constants.FOLDER_UID_CONFIRMATION] = { func: confirm, args: { messageCode: 'CLI_BP_FOLDER_ID_CONFIRMATION' } }
askFlags[constants.CONFIG] = { func: askInput, args: { messageCode: 'CLI_BP_CONFIG' } }
askFlags[constants.LOG_FILE] = { func: askInput, args: { messageCode: 'CLI_BP_LOG_FILE' } }
askFlags[constants.RETRY_FAILED] = { func: askInput, args: { messageCode: 'CLI_BP_RETRYFAILED' } }

// expects an object with queries
askFlags[constants.QUERY] = { func: askInput, args: { messageCode: 'CLI_BP_QUERIES' } }

// boolean options
askFlags[constants.BULK_PUBLISH] = { func: confirm, args: { messageCode: 'CLI_BP_BULKPUBLISH' } }
askFlags[constants.BULK_UNPUBLISH] = { func: confirm, args: { messageCode: 'CLI_BP_BULKUNPUBLISH' } }
askFlags[constants.PUBLISH_ALL_CONTENT_TYPES] = { func: confirm, args: { messageCode: 'CLI_BP_PUBLISH_ALL_CONTENTTYPES' } }
askFlags[constants.SKIP_WORKFLOW_STAGE_CHECK] = { func: confirm, args: { messageCode: 'CLI_BP_SKIP_WORKFLOW_STAGE_CHECK' } }
askFlags[constants.ONLY_ASSETS] = { func: confirm, args: { messageCode: 'CLI_BP_ONLYASSETS' } }
askFlags[constants.ONLY_ENTRIES] = { func: confirm, args: { messageCode: 'CLI_BP_ONLYENTRIES' } }
askFlags[constants.SKIP_PUBLISH] = { func: confirm, args: { messageCode: 'CLI_BP_SKIP_PUBLISH' } }

// const askFlags = {
//   'contentTypes': askContentTypes,
//   'contentType': askContentType,
//   'locales': askLocales,
//   'locale': askLocale,
//   'environments': askEnvironments,
//   'environment': askEnvironment,
//   'sourceEnv': askEnvironment,
//   'destEnv': askDeliveryToken,
//   'alias': askTokenAlias,
//   'bulkPublish': askBulkPublish,
//   'publishAllContentTypes': askPublishAllContentTypes,
//   'config': askConfig,
//   'skip-workflow-stage-check': askSkipWorkflowStageCheck,
//   'query': askQuery,
// }

function identifyMissingFlags(command, flags): Array<string> {
  const missing = []
  config.commands[command].flags.forEach(flag => {
    if (!flags[flag] && flagsToIgnore.indexOf(flag) === -1)
      missing.push(flag)
  })
  return missing
}

function askMissingFlags(command, flags, stack) {
  return new Promise(async resolve => {
    const questions = {}
    const missingFlags = identifyMissingFlags(command, flags)
    missingFlags.forEach(flag => {
      if (askFlags[flag] !== undefined)
        questions[flag] = askFlags[flag]
    })
    const answeredFlags = await mapSeries(command, questions, stack)
    resolve(answeredFlags)
  })
}

async function mapSeries(command, iterable, stack) {
  return new Promise(async resolve => {
    const results = {}
    for (const element of Object.keys(iterable)) {
      iterable[element]['args'].stack = stack
      if (validate(command, element, results)) {
        results[element] = await iterable[element]['func'](iterable[element]['args'])
      }
      // const temp = await iterable[element]['func'](iterable[element]['args'])
      // results[element] = temp
    }
    resolve(results)
  })
}


export const getMissingFlags = async (selectedCommand, flags, stack): Promise<string> => {
  return new Promise(async resolve => {
    let updatedFlags
    if (flags.config) {
      updatedFlags = store.updateMissing(config.commands[selectedCommand].configKey, flags)
    }
    updatedFlags = await askMissingFlags(selectedCommand, flags, stack)
    resolve(updatedFlags)
  })

}