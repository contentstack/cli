"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseTokenAlias = exports.chooseContentTypes = exports.chooseEntry = exports.chooseContentType = exports.chooseStack = exports.chooseOrganization = void 0;
const tslib_1 = require("tslib");
const ora_1 = tslib_1.__importDefault(require("ora"));
const configstore_1 = tslib_1.__importDefault(require("configstore"));
debugger;
const config = new configstore_1.default('contentstack_cli');
const inquirer = require('inquirer');
inquirer.registerPrompt('search-list', require('inquirer-search-list'));
inquirer.registerPrompt('search-checkbox', require('inquirer-search-checkbox'));
const { Command } = require('@contentstack/cli-command');
const ContentstackManagementSDK = require('@contentstack/management');
function chooseOrganization(displayMessage, region, orgUid) {
    return new Promise(async (resolve, reject) => {
        try {
            const command = new Command();
            command.managementAPIClient = { host: command.cmaHost, authtoken: command.authToken };
            const client = command.managementAPIClient;
            const spinner = ora_1.default('Loading Organizations').start();
            let { items: organizations } = await client.organization().fetchAll();
            spinner.stop();
            let orgMap = {};
            if (orgUid) {
                organizations.forEach((org) => {
                    orgMap[org.uid] = org.name;
                });
                if (orgMap[orgUid]) {
                    resolve({ orgUid: orgUid, orgName: orgMap[orgUid] });
                }
                else {
                    return reject(new Error('The given orgUid doesn\'t exist or you might not have access to it.'));
                }
            }
            else {
                organizations.forEach((org) => {
                    orgMap[org.name] = org.uid;
                });
                const orgList = Object.keys(orgMap);
                let inquirerConfig = {
                    type: 'search-list',
                    name: 'chosenOrganization',
                    message: displayMessage || 'Choose an organization',
                    choices: orgList,
                    loop: false,
                };
                debugger;
                inquirer.prompt(inquirerConfig).then(({ chosenOrganization }) => {
                    debugger;
                    resolve({ orgUid: orgMap[chosenOrganization], orgName: chosenOrganization });
                });
            }
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.chooseOrganization = chooseOrganization;
function chooseStack(organizationId, displayMessage, region) {
    return new Promise(async (resolve, reject) => {
        const command = new Command();
        command.managementAPIClient = { host: command.cmaHost, authtoken: command.authToken };
        const client = command.managementAPIClient;
        try {
            const spinner = ora_1.default('Loading Stacks').start();
            let { items: stacks } = await client.stack({ organization_uid: organizationId }).query({ query: {} }).find();
            spinner.stop();
            let stackMap = {};
            stacks.forEach((stack) => {
                stackMap[stack.name] = stack.api_key;
            });
            const stackList = Object.keys(stackMap);
            let inquirerConfig = {
                type: 'search-list',
                name: 'chosenStack',
                choices: stackList,
                message: displayMessage || 'Choose a stack',
                loop: false,
            };
            inquirer.prompt(inquirerConfig).then(({ chosenStack }) => {
                resolve({ api_key: stackMap[chosenStack], name: chosenStack });
            });
        }
        catch (error) {
            console.error(error.message);
        }
    });
}
exports.chooseStack = chooseStack;
function chooseContentType(stackApiKey, displayMessage, region) {
    return new Promise(async (resolve, reject) => {
        const command = new Command();
        command.managementAPIClient = { host: command.cmaHost, authtoken: command.authToken };
        const client = command.managementAPIClient;
        try {
            const spinner = ora_1.default('Loading Content Types').start();
            // let {items: contentTypes} = await client.stack({api_key: stackApiKey}).contentType().query({include_count: true}).find()
            let contentTypes = await getAll(client.stack({ api_key: stackApiKey }).contentType());
            spinner.stop();
            let contentTypeMap = {};
            contentTypes.forEach((contentType) => {
                contentTypeMap[contentType.title] = contentType.uid;
            });
            const contentTypeList = Object.keys(contentTypeMap);
            let inquirerConfig = {
                type: 'search-list',
                name: 'chosenContentType',
                choices: contentTypeList,
                message: displayMessage || 'Choose a content type',
                loop: false,
            };
            inquirer.prompt(inquirerConfig).then(({ chosenContentType }) => {
                resolve({ uid: contentTypeMap[chosenContentType], title: chosenContentType });
            });
        }
        catch (error) {
            console.error(error.message);
        }
    });
}
exports.chooseContentType = chooseContentType;
function chooseEntry(contentTypeUid, stackApiKey, displayMessage, region) {
    return new Promise(async (resolve, reject) => {
        const command = new Command();
        command.managementAPIClient = { host: command.cmaHost, authtoken: command.authToken };
        const client = command.managementAPIClient;
        try {
            const spinner = ora_1.default('Loading Entries').start();
            let entries = await getAll(client.stack({ api_key: stackApiKey }).contentType(contentTypeUid).entry());
            spinner.stop();
            let entryMap = {};
            entries.forEach((entry) => {
                entryMap[entry.title] = entry.uid;
            });
            const entryList = Object.keys(entryMap);
            let inquirerConfig = {
                type: 'search-list',
                name: 'chosenEntry',
                choices: entryList,
                message: displayMessage || 'Choose an entry',
                loop: false
            };
            inquirer.prompt(inquirerConfig).then(({ chosenEntry }) => {
                resolve({ uid: entryMap[chosenEntry], title: chosenEntry });
            });
        }
        catch (error) {
            console.error(error.message);
        }
    });
}
exports.chooseEntry = chooseEntry;
function chooseContentTypes(stackApiKey, displayMessage, region) {
    return new Promise(async (resolve, reject) => {
        const command = new Command();
        command.managementAPIClient = { host: command.cmaHost, authtoken: command.authToken };
        const client = command.managementAPIClient;
        try {
            const spinner = ora_1.default('Loading Content Types').start();
            // let {items: contentTypes} = await client.stack({api_key: stackApiKey}).contentType().query({include_count: true}).find()
            let contentTypes = await getAll(client.stack({ api_key: stackApiKey }).contentType());
            spinner.stop();
            let contentTypeMap = {};
            contentTypes.forEach((contentType) => {
                contentTypeMap[contentType.title] = contentType.uid;
            });
            const contentTypeList = Object.keys(contentTypeMap);
            let inquirerConfig = {
                type: 'search-checkbox',
                name: 'chosenContentTypes',
                choices: contentTypeList,
                message: displayMessage || 'Choose a content type',
                loop: false,
            };
            inquirer.prompt(inquirerConfig).then(({ chosenContentTypes }) => {
                let result = chosenContentTypes.map(ct => {
                    let foo = { uid: contentTypeMap[ct], title: ct };
                    return foo;
                });
                resolve(result);
            });
        }
        catch (error) {
            console.error(error.message);
        }
    });
}
exports.chooseContentTypes = chooseContentTypes;
function chooseTokenAlias() {
    return new Promise(async (resolve, reject) => {
        const tokens = config.get('tokens');
        const tokenList = Object.keys(tokens).filter((token) => tokens[token].type === 'management');
        let inquirerConfig = {
            type: 'search-list',
            name: 'chosenToken',
            choices: tokenList,
            message: 'Choose a stack to use',
            loop: false,
        };
        inquirer.prompt(inquirerConfig).then(({ chosenToken }) => {
            resolve(tokens[chosenToken].apiKey);
        });
    });
}
exports.chooseTokenAlias = chooseTokenAlias;
async function getAll(element, skip = 0) {
    return new Promise(async (resolve) => {
        let result = [];
        result = await fetch(element, skip, result);
        resolve(result);
    });
}
async function fetch(element, skip, accumulator) {
    return new Promise(async (resolve) => {
        let queryParams = { include_count: true, skip: skip };
        let { items: result, count: count } = await element.query(queryParams).find();
        accumulator = accumulator.concat(result);
        skip += result.length;
        if (skip < count)
            return resolve(await fetch(element, skip, accumulator));
        return resolve(accumulator);
    });
}
// async function callMe() {
// 	// let organization = await chooseOrganization()
// 	// console.log(organization)
// 	// let stack = await chooseStack(organization.orgUid)
// 	// console.log(stack)
// 	// let contentType = await chooseContentType(stack.api_key)
// 	// console.log(contentType)
// 	// let entry = await chooseEntry(contentType.uid, stack.api_key)
// 	// console.log(entry)
// 	// let entry = await chooseEntry(contentType.uid, stack.api_key)
// 	// console.log(entry)
// 	let token = await chooseTokenAlias()
// 	console.log(token)
// }
// callMe()
//# sourceMappingURL=index.js.map