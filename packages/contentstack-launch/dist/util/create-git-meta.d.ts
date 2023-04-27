export declare function parseGitConfig(configPath: string): Promise<{
    [key: string]: any;
} | undefined>;
export declare function pluckRemoteUrls(gitConfig: {
    [key: string]: any;
}): {
    [key: string]: string;
} | undefined;
export declare function getRemoteUrls(configPath: string): Promise<{
    [key: string]: string;
} | undefined>;
