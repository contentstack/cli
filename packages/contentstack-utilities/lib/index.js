"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseEntry = exports.chooseContentType = exports.chooseStack = exports.chooseOrganization = void 0;
const ora_1 = __importDefault(require("ora"));
const inquirer = require('inquirer');
const { Command } = require('@contentstack/cli-command');
const ContentstackManagementSDK = require('@contentstack/management');
function chooseOrganization(displayMessage, region, orgUid) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        try {
            const command = new Command();
            command.managementAPIClient = { host: command.cmaHost, authtoken: command.authToken };
            const client = command.managementAPIClient;
            const spinner = ora_1.default('Loading Organizations').start();
            let { items: organizations } = yield client.organization().fetchAll();
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
                    type: 'list',
                    name: 'chosenOrganization',
                    message: displayMessage || 'Choose an organization',
                    choices: orgList
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
    }));
}
exports.chooseOrganization = chooseOrganization;
function chooseStack(organizationId, displayMessage, region) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        const command = new Command();
        command.managementAPIClient = { host: command.cmaHost, authtoken: command.authToken };
        const client = command.managementAPIClient;
        try {
            const spinner = ora_1.default('Loading Stacks').start();
            let { items: stacks } = yield client.stack({ organization_uid: organizationId }).query({ query: {} }).find();
            spinner.stop();
            let stackMap = {};
            stacks.forEach((stack) => {
                stackMap[stack.name] = stack.api_key;
            });
            const stackList = Object.keys(stackMap);
            let inquirerConfig = {
                type: 'list',
                name: 'chosenStack',
                choices: stackList,
                message: displayMessage || 'Choose a stack'
            };
            inquirer.prompt(inquirerConfig).then(({ chosenStack }) => {
                resolve({ api_key: stackMap[chosenStack], name: chosenStack });
            });
        }
        catch (error) {
            console.error(error.message);
        }
    }));
}
exports.chooseStack = chooseStack;
function chooseContentType(stackApiKey, displayMessage, region) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        const command = new Command();
        command.managementAPIClient = { host: command.cmaHost, authtoken: command.authToken };
        const client = command.managementAPIClient;
        try {
            const spinner = ora_1.default('Loading Content Types').start();
            let { items: contentTypes } = yield client.stack({ api_key: stackApiKey }).contentType().query().find();
            spinner.stop();
            let contentTypeMap = {};
            contentTypes.forEach((contentType) => {
                contentTypeMap[contentType.title] = contentType.uid;
            });
            const contentTypeList = Object.keys(contentTypeMap);
            let inquirerConfig = {
                type: 'list',
                name: 'chosenContentType',
                choices: contentTypeList,
                message: displayMessage || 'Choose a content type'
            };
            inquirer.prompt(inquirerConfig).then(({ chosenContentType }) => {
                resolve({ uid: contentTypeMap[chosenContentType], title: chosenContentType });
            });
        }
        catch (error) {
            console.error(error.message);
        }
    }));
}
exports.chooseContentType = chooseContentType;
function chooseEntry(contentTypeUid, stackApiKey, displayMessage, region) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        const command = new Command();
        command.managementAPIClient = { host: command.cmaHost, authtoken: command.authToken };
        const client = command.managementAPIClient;
        try {
            const spinner = ora_1.default('Loading Entries').start();
            let { items: entries } = yield client.stack({ api_key: stackApiKey }).contentType(contentTypeUid).entry().query().find();
            spinner.stop();
            let entryMap = {};
            entries.forEach((entry) => {
                entryMap[entry.title] = entry.uid;
            });
            const entryList = Object.keys(entryMap);
            let inquirerConfig = {
                type: 'list',
                name: 'chosenEntry',
                choices: entryList,
                message: displayMessage || 'Choose an entry'
            };
            inquirer.prompt(inquirerConfig).then(({ chosenEntry }) => {
                resolve({ uid: entryMap[chosenEntry], title: chosenEntry });
            });
        }
        catch (error) {
            console.error(error.message);
        }
    }));
}
exports.chooseEntry = chooseEntry;
