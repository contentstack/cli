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
    region: any
) => {
    const environmentResult = await managementAPIClient.stack({ api_key }).environment().query().find()
    if (Array.isArray(environmentResult.items) && environmentResult.items.length > 0) {
        for (const environment of environmentResult.items) {
            if (environment.name) {
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
                        const environmentVariables: EnviornmentVariables = {
                            api_key,
                            deliveryToken: tokenResult.token,
                            environment: environment.name
                        }
                        await envFileHandler(
                            appConfig.appConfigKey || "",
                            environmentVariables,
                            clonedDirectory,
                            region,
                        )
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
    region: any
) => {
    if (!appConfigKey || !environmentVariables) {
        return
    }
    let content
    let result
    let filePath
    let fileName
    let customHost;
    const regionName = region && region.name && region.name.toLowerCase();
    const isUSRegion = (regionName === 'us' || regionName === 'na')
    if (regionName !== 'eu' && !isUSRegion) {
        customHost = region.cda && region.cda.substring('8');
    }
    const production = (environmentVariables.environment === 'production' ? true : false)
    switch (appConfigKey) {
        case 'reactjs':
        case 'reactjs-starter':
            fileName = `.env.${environmentVariables.environment}.local`
            filePath = path.join(clonedDirectory, fileName)
            content = `REACT_APP_APIKEY=${environmentVariables.api_key}\nREACT_APP_DELIVERY_TOKEN=${environmentVariables.deliveryToken}\nREACT_APP_ENVIRONMENT=${environmentVariables.environment}${(customHost ? '\nREACT_APP_CUSTOM_HOST=' + customHost : '')}${(!isUSRegion && !customHost) ? '\nREACT_APP_REGION=' + region.name : ''}`
            result = await writeEnvFile(content, filePath)
            break
        case 'nextjs':
        case 'nextjs-starter':
            fileName = `.env.${environmentVariables.environment}.local`
            filePath = path.join(clonedDirectory, fileName)
            content = `API_KEY=${environmentVariables.api_key}\nDELIVERY_TOKEN=${environmentVariables.deliveryToken}\nENVIRONMENT=${environmentVariables.environment}${(customHost ? '\nCUSTOM_HOST=' + customHost : '')}${(!isUSRegion && !customHost ? '\nREGION=' + region.name : '')}`
            result = await writeEnvFile(content, filePath)
            break
        case 'gatsby':
        case 'gatsby-starter':
            fileName = `.env.${environmentVariables.environment}`
            filePath = path.join(clonedDirectory, fileName)
            content = `CONTENTSTACK_API_KEY=${environmentVariables.api_key}\nCONTENTSTACK_DELIVERY_TOKEN=${environmentVariables.deliveryToken}\nCONTENTSTACK_ENVIRONMENT=${environmentVariables.environment}\nCONTENTSTACK_CDN=${region.cda}/v3`
            result = await writeEnvFile(content, filePath)
            break
        case 'angular':
            content = `export const environment = { \n\t production:${(environmentVariables.environment === 'production' ? true : false)}, \n\t config : { \n\t\t api_key: '${environmentVariables.api_key}', \n\t\t delivery_token: '${environmentVariables.deliveryToken}', \n\t\t environment: '${environmentVariables.environment}${ (!isUSRegion && !customHost ? `,\n\t\tregion:='${region.name}'` : '')} \n\t } \n };`
            fileName = `environment${(environmentVariables.environment === 'production' ? '.prod.' : ".")}ts`
            filePath = path.join(
                clonedDirectory,
                'src',
                'environments',
                fileName
            )
            result = await writeEnvFile(content, filePath)
            break
        case 'angular-starter':
                content = `export const environment = { \n\t production: true \n}; \nexport const Config = { \n\t api_key: '${environmentVariables.api_key}', \n\t delivery_token: '${environmentVariables.deliveryToken}', \n\t environment: '${environmentVariables.environment}'${( !isUSRegion && !customHost ? `,\n\t\tregion:='${region.name}'`: '') } \n};`
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
        case 'nuxt-starter':
            fileName = (production ? '.env.production' : '.env')
            filePath = path.join(clonedDirectory, fileName)
            content = `CONTENTSTACK_API_KEY=${environmentVariables.api_key}\nCONTENTSTACK_DELIVERY_TOKEN=${environmentVariables.deliveryToken}\nCONTENTSTACK_ENVIRONMENT=${environmentVariables.environment}${(!isUSRegion && !customHost ? '\nCONTENTSTACK_REGION=' + region.name : '')}`
            result = await writeEnvFile(content, filePath)
            break
        default:
            cli.error(messageHandler.parse('CLI_BOOTSTRAP_INVALID_APP_NAME'))
    }

    return result
}
