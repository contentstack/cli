"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseStack = exports.chooseOrganization = exports.orgClass = void 0;
var ora_1 = __importDefault(require("ora"));
var inquirer = require('inquirer');
var Command = require('@contentstack/cli-command').Command;
var ContentstackManagementSDK = require('@contentstack/management');
var orgClass = /** @class */ (function (_super) {
    __extends(orgClass, _super);
    function orgClass() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Object.defineProperty(orgClass.prototype, "managementAPIClient", {
        get: function () {
            this._managementAPIClient = ContentstackManagementSDK.client({ host: this.cmaHost, authtoken: this.authToken });
            return this._managementAPIClient;
        },
        enumerable: false,
        configurable: true
    });
    return orgClass;
}(Command));
exports.orgClass = orgClass;
function chooseOrganization(displayMessage, region, orgUid) {
    var _this = this;
    return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
        var command, client, spinner, organizations, orgMap_1, orgList, inquirerConfig, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    command = new orgClass();
                    client = command.managementAPIClient;
                    spinner = ora_1.default('Loading Organizations').start();
                    return [4 /*yield*/, client.organization().fetchAll()];
                case 1:
                    organizations = (_a.sent()).items;
                    spinner.stop();
                    orgMap_1 = {};
                    if (orgUid) {
                        organizations.forEach(function (org) {
                            orgMap_1[org.uid] = org.name;
                        });
                        if (orgMap_1[orgUid]) {
                            resolve({ orgUid: orgUid, orgName: orgMap_1[orgUid] });
                        }
                        else {
                            return [2 /*return*/, reject(new Error('The given orgUid doesn\'t exist or you might not have access to it.'))];
                        }
                    }
                    else {
                        organizations.forEach(function (org) {
                            orgMap_1[org.name] = org.uid;
                        });
                        orgList = Object.keys(orgMap_1);
                        inquirerConfig = {
                            type: 'list',
                            name: 'chosenOrganization',
                            message: displayMessage || 'Choose an organization',
                            choices: orgList
                        };
                        inquirer.prompt(inquirerConfig).then(function (_a) {
                            var chosenOrganization = _a.chosenOrganization;
                            debugger;
                            resolve({ orgUid: orgMap_1[chosenOrganization], orgName: chosenOrganization });
                        });
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    reject(error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); });
}
exports.chooseOrganization = chooseOrganization;
function chooseStack(organizationId, displayMessage, region) {
    var _this = this;
    return new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
        var command, client, spinner, stacks, stackMap_1, stackList, inquirerConfig, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    command = new orgClass();
                    client = command.managementAPIClient;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    spinner = ora_1.default('Loading Stacks').start();
                    return [4 /*yield*/, client.stack({ organization_uid: organizationId }).query({ query: {} }).find()];
                case 2:
                    stacks = (_a.sent()).items;
                    spinner.stop();
                    stackMap_1 = {};
                    stacks.forEach(function (stack) {
                        stackMap_1[stack.name] = stack.api_key;
                    });
                    stackList = Object.keys(stackMap_1);
                    inquirerConfig = {
                        type: 'list',
                        name: 'chosenStack',
                        choices: stackList,
                        message: displayMessage || 'Choose a stack'
                    };
                    inquirer.prompt(inquirerConfig).then(function (_a) {
                        var chosenStack = _a.chosenStack;
                        resolve({ api_key: stackMap_1[chosenStack], name: chosenStack });
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    console.error(error_2.message);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
}
exports.chooseStack = chooseStack;
