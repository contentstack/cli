export declare class Contentfly {
    private pathToSourceCode;
    private cloudFunctions;
    constructor(dirPath: string);
    serveCloudFunctions(servingPort: number): Promise<void>;
}
