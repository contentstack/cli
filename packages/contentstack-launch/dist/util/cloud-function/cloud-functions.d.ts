export declare class CloudFunctions {
    private cloudFunctionsDirectoryPath;
    private pathToSourceCode;
    constructor(pathToSourceCode: string);
    serve(servingPort: number): Promise<void>;
    private applyAppRouter;
    private parseCloudFunctionResources;
    private transformAndSegregateResourcesByRoutes;
    private checkDefaultExport;
}
