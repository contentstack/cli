import { IPromptOptions } from "@oclif/core/lib/cli-ux";
export interface PrintOptions {
    color?: string;
}
export interface InquirePayload {
    type: string;
    name: string;
    message: string;
    choices?: Array<any>;
    transformer?: Function;
    validate?: Function;
}
export interface Region {
    name: string;
    cma: string;
    cda: string;
}
export interface Token {
    token: string;
    apiKey: string;
}
export interface Organization {
    uid: string;
    name: string;
}
export interface selectedOrganization {
    orgUid: string;
    orgName: string;
}
export interface Stack {
    name: string;
    api_key: string;
}
export interface ContentType {
    uid: string;
    title: string;
}
export interface Environment {
    name: string;
    uid: string;
}
export interface Entry {
    uid: string;
    title: string;
}
export interface Locale {
    name: string;
    code: string;
}
export interface CliUXPromptOptions extends IPromptOptions {
}
