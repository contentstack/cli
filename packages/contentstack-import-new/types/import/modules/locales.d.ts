/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
export default class ImportLanguages {
    client: any;
    fails: any[];
    success: any[];
    langUidMapper: {};
    masterLanguage: any;
    langConfig: any;
    reqConcurrency: any;
    private config;
    private languages;
    constructor({ importConfig, stackAPIClient }: {
        importConfig: any;
        stackAPIClient: any;
    });
    start(): any;
    updateLocales(langUids: any): any;
}
