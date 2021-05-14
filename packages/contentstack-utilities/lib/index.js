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
exports.chooseStack = exports.chooseOrganization = exports.orgClass = void 0;
const ora_1 = __importDefault(require("ora"));
const inquirer = require('inquirer');
const { Command } = require('@contentstack/cli-command');
const ContentstackManagementSDK = require('@contentstack/management');
class orgClass extends Command {
    get managementAPIClient() {
        this._managementAPIClient = ContentstackManagementSDK.client({ host: this.cmaHost, authtoken: this.authToken });
        return this._managementAPIClient;
    }
}
exports.orgClass = orgClass;
function chooseOrganization(displayMessage, region, orgUid) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        try {
            const command = new orgClass();
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
        const command = new orgClass();
        const client = command.managementAPIClient;
        try {
            const spinner = ora_1.default('Loading Stacks').start();
            let { items: stacks } = yield client.stack({ organization_uid: organizationId }).query({ query: {} }).find();
            spinner.stop();
            let stackMap = {};
            debugger
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
function callMe() {
    return __awaiter(this, void 0, void 0, function* () {
        // let organization = await chooseOrganization()
        // console.log(organization)
        let stack = yield chooseStack('bltdf4dfa3134a29d66');
        console.log(stack);
    });
}
callMe();
