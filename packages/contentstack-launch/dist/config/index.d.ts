declare const config: {
    maxRetryCount: number;
    configName: string;
    logsApiEndpoint: string;
    manageApiEndpoint: string;
    projectCreationRetryMaxCount: number;
    fileUploadConfig: {
        exclude: string[];
    };
    outputDirectories: {
        OTHER: string;
        NEXTJS: string;
        GATSBY: string;
    };
    listOfFrameWorks: {
        name: string;
        value: string;
    }[];
    providerMapper: {
        GITPROVIDER: string;
        FILEUPLOAD: string;
    };
    launchHubUrls: {
        'https://api.contentstack.io': string;
        'https://eu-api.contentstack.com': string;
        'https://azure-na-api.contentstack.com': string;
        'https://dev11-api.csnonprod.com': string;
        'https://stag-api.csnonprod.com': string;
    };
    supportedAdapters: string[];
    deploymentStatus: string[];
    pollingInterval: number;
};
export default config;
