import cli from 'cli-ux'
import * as fs from 'fs'
import * as path from 'path'
import { AppConfig } from '../config'
import messageHandler from '../messages'

interface EnviornmentVariables {
    api_key: string;
    deliveryToken: string;
    environment: string;
}

const writeEnvFile = (content: string, fileName: string) => {
    if (!content || !fileName) {
        return
    }
    return new Promise((resolve, reject) => {
        fs.writeFile(
            fileName,
            content,
            'utf8',
            error => {
                if (error) {
                    reject(error)
                } else {
                    resolve('done')
                }
            })
    })
}

/**
 * @description Create environment files for each app
 * TBD: moving the content to config file
 */

const envFileHandler = async (
    appConfigKey: string,
    environmentVariables: EnviornmentVariables,
    clonedDirectory: string,
    region: any,
) => {
    if (!appConfigKey || !environmentVariables) {
        return
    }
    let content
    let result
    let filePath
    let fileName
    const production = (environmentVariables.environment === 'production' ? true : false)
    appConfigKey = appConfigKey.split('-')[0]
    switch (appConfigKey) {
        case 'reactjs':
            fileName = `.env.${environmentVariables.environment}.local`
            filePath = path.join(clonedDirectory, fileName)
            content = `REACT_APP_APIKEY=${environmentVariables.api_key}\nREACT_APP_DELIVERY_TOKEN=${environmentVariables.deliveryToken}\nREACT_APP_ENVIRONMENT=${environmentVariables.environment}\nREACT_APP_REGION=${region.name}`
            result = await writeEnvFile(content, filePath)
            break
        case 'nextjs':
            fileName = `.env.${environmentVariables.environment}.local`
            filePath = path.join(clonedDirectory, fileName)
            content = `API_KEY=${environmentVariables.api_key}\nDELIVERY_TOKEN=${environmentVariables.deliveryToken}\nENVIRONMENT=${environmentVariables.environment}\nREGION=${region.name}`
            result = await writeEnvFile(content, filePath)
            break
        case 'gatsby':
            fileName = `.env.${environmentVariables.environment}`
            filePath = path.join(clonedDirectory, fileName)
            content = `CONTENTSTACK_API_KEY=${environmentVariables.api_key}\nCONTENTSTACK_DELIVERY_TOKEN=${environmentVariables.deliveryToken}\nCONTENTSTACK_ENVIRONMENT=${environmentVariables.environment}\nCONTENTSTACK_CDN=${region.cda}`
            result = await writeEnvFile(content, filePath)
            break
        case 'angular':
            content = `export const environment = { \n\t production:${(environmentVariables.environment === 'production' ? true : false)}, \n\t config : { \n\t\t api_key: '${environmentVariables.api_key}', \n\t\t delivery_token: '${environmentVariables.deliveryToken}', \n\t\t environment: '${environmentVariables.environment}', \n\t\t region: '${region.name}' \n\t } \n };`
            fileName = `environment${(environmentVariables.environment === 'production' ? '.prod.' : ".")}ts`
            filePath = path.join(
                clonedDirectory,
                'src',
                'environments',
                fileName
            )
            result = await writeEnvFile(content, filePath)
            break
        case 'nuxtjs':
            fileName = (production ? '.env.production' : '.env')
            filePath = path.join(clonedDirectory, fileName)
            content = `api_key=${environmentVariables.api_key}\ndelivery_token=${environmentVariables.deliveryToken}\nenvironment=${environmentVariables.environment}\nregion=${region.name}`
            result = await writeEnvFile(content, filePath)
            break
        default:
            cli.error(messageHandler.parse('CLI_BOOTSTRAP_INVALID_APP_NAME'))
    }

    return result
}


/**
 * @description Setup the environment for a given app for each environment
 * Loads the environments for a given stack
 * Create delivery token
 * Create enviroment
 */

 export const setupEnvironments = async (
    managementAPIClient: any,
    api_key: string,
    appConfig: AppConfig,
    clonedDirectory: string,
    region: any,
 ) => {
    const result = []
    const environmentResult = await managementAPIClient.stack({ api_key }).environment().query().find()
    if (Array.isArray(environmentResult.items) && environmentResult.items.length > 0) {
        for (const environment of environmentResult.items) {
            const enviromentPayload: any = {}
            if (environment.name) {
                enviromentPayload.name = environment.name
                enviromentPayload.apiKey = environment.stackHeaders && environment.stackHeaders.api_key
                enviromentPayload.url =
                    Array.isArray(environment.urls) &&
                    environment.urls.length > 0 &&
                    environment.urls[0].url
                enviromentPayload.locale =
                    Array.isArray(environment.urls) &&
                    environment.urls.length > 0 &&
                    environment.urls[0].locale
                const body = {
                    'token': {
                        'name': `Sample app ${environment.name}`,
                        'description': 'Sample app',
                        'scope': [{
                            'module': 'environment',
                            'environments': [environment.name],
                            'acl': {
                                'read': true
                            }
                        }]
                    }
                }
                try {
                    const tokenResult = await managementAPIClient.stack({ api_key }).deliveryToken().create(body)
                    if (tokenResult.token) {
                        enviromentPayload.deliveryToken = tokenResult.token
                        const environmentVariables: EnviornmentVariables = {
                            api_key,
                            deliveryToken: tokenResult.token,
                            environment: environment.name
                        }
                        await envFileHandler(
                            appConfig.appConfigKey || "",
                            environmentVariables,
                            clonedDirectory,
                            region
                        )
                        result.push(enviromentPayload)
                    } else {
                        cli.log(messageHandler.parse('CLI_BOOTSTRAP_APP_FAILED_TO_CREATE_TOKEN_FOR_ENV', environment.name))
                    }
                } catch (error) {
                    cli.log(messageHandler.parse('CLI_BOOTSTRAP_APP_FAILED_TO_CREATE_ENV_FILE_FOR_ENV', environment.name))
                }
            } else {
                cli.log('No environments name found for the environment')
            }
        }
    } else {
        cli.error(messageHandler.parse('CLI_BOOTSTRAP_APP_ENV_NOT_FOUND_FOR_THE_STACK'))
    }
     
    return result
 }

export const printSummary = (
    appInfo,
    enviromentsInfo
) => {
    if (typeof appInfo !== 'object' || !Array.isArray(enviromentsInfo)) {
        cli.log('\n')
        cli.log(messageHandler.parse('CLI_BOOTSTRAP_SUCCESS'))
    }

    enviromentsInfo = enviromentsInfo.map(environment => {
        return  {
            apiKey: environment.apiKey,
            deliveryToken: environment.deliveryToken,
            environment: environment.name,
            host: environment.url,
            locale: environment.locale,
        }
    })

    // Print    cli.log('\n')
    cli.log('=============SUMMARY START================')
    cli.log('\n')
    cli.log('App Info')
    cli.log('--------')
    cli.table([{
      appName: appInfo.appName,
      path: appInfo.path,
      type: appInfo.type,
    }], {
      appName: {
        header: 'Name',
      },
      path: {
        header: 'Location',
      },
      type: {
        header: 'Type',
      },
    })
    cli.log('\n')
    cli.log('Environments')
    cli.log('------------')
    cli.table(enviromentsInfo, {
        environment: {
            header: 'Environment',
        },
        locale: {
            header: 'Locale',
        },
        apiKey: {
          header: 'API Key',
        },
        deliveryToken: {
          header: 'Delivery Token',
        },
        host: {
          header: 'Base URL',
        },
    })
    cli.log('\n')
    cli.log('Follow below steps to run the app  (use npm/yarn package manager)')
    cli.log('-----------------------------------------------------------------')
    cli.log('  1. move to project root folder')
    cli.log('  2. npm i - installs the depencies')
    cli.log('  3. npm start - application starts')
    cli.log('\n')
    cli.log('Find out more on - https://www.contentstack.com/docs')
    cli.log('\n')
    cli.log('=============SUMMARY END================')
    cli.log('\n')

}